import Constants from "expo-constants";
import { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
} from "react-native";

const LOOKUP_TIMEOUT = 15000;
const CHECK_INTERVAL = 30 * 60 * 1000;

const PLAY_VERSION_PATTERNS = [
  /\[\[\["(\d+(?:\.\d+)+)"\]\]/,
  /Current Version[\s\S]{0,200}?>(\d+(?:\.\d+)+)</,
  /"version"\s*:\s*"(\d+(?:\.\d+)+)"/,
];

interface StoreRelease {
  version: string;
  storeUrl: string;
  webUrl: string;
  minimumOsVersion?: string;
}

interface ItunesListing {
  version?: string;
  trackId?: number;
  trackViewUrl?: string;
  minimumOsVersion?: string;
}

interface ItunesResponse {
  resultCount?: number;
  results?: ItunesListing[];
}

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .split(".")
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isNaN(n) ? 0 : n;
      });

  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}

async function fetchWithTimeout(
  url: string,
  headers?: Record<string, string>,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    return response.ok ? response : null;
  } catch (error) {
    if ((error as Error)?.name !== "AbortError") {
      console.warn("Could not reach the app store", error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAppStoreRelease(
  bundleId: string,
): Promise<StoreRelease | null> {
  const response = await fetchWithTimeout(
    `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(
      bundleId,
    )}&_=${Date.now()}`,
  );

  if (!response) {
    return null;
  }

  try {
    const body = (await response.json()) as ItunesResponse;
    const listing = body.results?.[0];

    if (!listing?.version || !listing.trackId) {
      return null;
    }

    return {
      version: listing.version,
      storeUrl: `itms-apps://apps.apple.com/app/id${listing.trackId}`,
      webUrl:
        listing.trackViewUrl ??
        `https://apps.apple.com/app/id${listing.trackId}`,
      minimumOsVersion: listing.minimumOsVersion,
    };
  } catch (error) {
    console.warn("Could not parse the App Store response", error);
    return null;
  }
}

async function fetchPlayStoreRelease(
  packageName: string,
): Promise<StoreRelease | null> {
  const webUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(
    packageName,
  )}`;

  const response = await fetchWithTimeout(`${webUrl}&hl=en&gl=us`, {
    "Accept-Language": "en-US,en;q=0.9",
  });

  if (!response) {
    return null;
  }

  try {
    const html = await response.text();

    for (const pattern of PLAY_VERSION_PATTERNS) {
      const version = html.match(pattern)?.[1];
      if (version) {
        return {
          version,
          storeUrl: `market://details?id=${packageName}`,
          webUrl,
        };
      }
    }

    console.warn("Could not find a version on the Play Store listing");
    return null;
  } catch (error) {
    console.warn("Could not parse the Play Store listing", error);
    return null;
  }
}

function deviceCanRun(release: StoreRelease): boolean {
  if (!release.minimumOsVersion) {
    return true;
  }

  return (
    compareVersions(String(Platform.Version), release.minimumOsVersion) >= 0
  );
}

async function openStore(release: StoreRelease) {
  try {
    if (await Linking.canOpenURL(release.storeUrl)) {
      await Linking.openURL(release.storeUrl);
      return;
    }
    await Linking.openURL(release.webUrl);
  } catch (error) {
    console.error("Could not open the app store", error);
  }
}

export function useForceUpdate() {
  const currentVersion = Constants.expoConfig?.version ?? null;
  const appId =
    (Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.bundleIdentifier
      : Constants.expoConfig?.android?.package) ?? null;

  const appState = useRef(AppState.currentState);
  const alertShowing = useRef(false);
  const cachedRelease = useRef<StoreRelease | null>(null);
  const lastCheckedAt = useRef(0);

  const enabled =
    (Platform.OS === "ios" || Platform.OS === "android") &&
    !__DEV__ &&
    !!currentVersion &&
    !!appId &&
    !appId.endsWith(".dev");

  const resolveRelease = useCallback(async (): Promise<StoreRelease | null> => {
    if (!appId) {
      return null;
    }

    const now = Date.now();

    if (cachedRelease.current && now - lastCheckedAt.current < CHECK_INTERVAL) {
      return cachedRelease.current;
    }

    const release =
      Platform.OS === "ios"
        ? await fetchAppStoreRelease(appId)
        : await fetchPlayStoreRelease(appId);

    if (release) {
      cachedRelease.current = release;
      lastCheckedAt.current = now;
    }

    return release;
  }, [appId]);

  const check = useCallback(async () => {
    if (!enabled || !currentVersion || alertShowing.current) {
      return;
    }

    const release = await resolveRelease();

    if (
      !release ||
      !deviceCanRun(release) ||
      compareVersions(currentVersion, release.version) >= 0
    ) {
      return;
    }

    alertShowing.current = true;

    Alert.alert(
      "Update Required",
      `HCB ${release.version} is available. Please update to keep using the app.`,
      [
        {
          text: "Update",
          onPress: () => {
            alertShowing.current = false;
            openStore(release);
          },
        },
      ],
      { cancelable: false },
    );
  }, [enabled, currentVersion, resolveRelease]);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          check();
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [enabled, check]);
}
