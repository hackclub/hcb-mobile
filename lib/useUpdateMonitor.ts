import { Asset } from "expo-asset";
import {
  useUpdates,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  type ReloadScreenOptions,
} from "expo-updates";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { splashBackgroundColor } from "@/styles/theme";

const CRITICAL_RELOAD_DELAY_MS = 2000;
const ANDROID_SPLASH_LOGO_DP = 288;

const splashModule =
  Platform.OS === "ios"
    ? require("../assets/splash-ios.png")
    : require("../assets/splash-android.png");

let splashUri: Promise<string | undefined> | null = null;

function getSplashUri(): Promise<string | undefined> {
  splashUri ??= Asset.fromModule(splashModule)
    .downloadAsync()
    .then((asset) => asset.localUri ?? asset.uri)
    .catch(() => undefined);
  return splashUri;
}

function reloadScreenOptions(uri: string | undefined): ReloadScreenOptions {
  if (!uri) {
    return {
      backgroundColor: splashBackgroundColor,
      fade: true,
      spinner: { enabled: true, color: "#ffffff" },
    };
  }

  return {
    backgroundColor: splashBackgroundColor,
    fade: true,
    spinner: { enabled: false },
    imageFullScreen: false,
    imageResizeMode: "contain",
    image:
      Platform.OS === "ios"
        ? uri
        : {
            url: uri,
            width: ANDROID_SPLASH_LOGO_DP,
            height: ANDROID_SPLASH_LOGO_DP,
            scale: 1,
          },
  };
}

const isUpdateCritical = (
  updatesSystem: ReturnType<typeof useUpdates>,
): boolean => {
  const { availableUpdate } = updatesSystem;

  const manifest = availableUpdate?.manifest as
    | { extra?: { expoClient?: { extra?: { message?: string } } } }
    | undefined;
  const message =
    manifest?.extra?.expoClient?.extra?.message?.toLowerCase() ?? "";
  return message.includes("critical");
};

export function useUpdateMonitor() {
  const updatesSystem = useUpdates();
  const appState = useRef(AppState.currentState);
  const hasAutoDownloaded = useRef(false);
  const hasScheduledReload = useRef(false);

  const {
    isUpdateAvailable,
    isUpdatePending,
    availableUpdate,
    currentlyRunning,
  } = updatesSystem;

  const isUpdateDifferent =
    availableUpdate?.updateId !== undefined &&
    availableUpdate?.updateId !== currentlyRunning.updateId;

  const hasUpdate = isUpdateAvailable && isUpdateDifferent;
  const hasPendingUpdate = isUpdatePending && isUpdateDifferent;

  const isCritical =
    (hasUpdate || hasPendingUpdate) && isUpdateCritical(updatesSystem);

  const checkForUpdate = useCallback(async (): Promise<void> => {
    if (__DEV__) {
      return;
    }

    try {
      await checkForUpdateAsync();
    } catch (error) {
      console.error("Error checking for updates:", error);
    }
  }, []);

  const downloadUpdate = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUpdateAsync();
      return true;
    } catch (error) {
      console.error("Error downloading update:", error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async (): Promise<void> => {
    try {
      const uri = await getSplashUri();
      await reloadAsync({ reloadScreenOptions: reloadScreenOptions(uri) });
    } catch (error) {
      console.error("Error applying update:", error);
    }
  }, []);

  useEffect(() => {
    getSplashUri();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // App came to foreground
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          checkForUpdate();
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate]);

  useEffect(() => {
    const initialCheck = async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await checkForUpdate();
    };

    initialCheck();
  }, [checkForUpdate]);

  useEffect(() => {
    if (!hasUpdate || hasPendingUpdate || hasAutoDownloaded.current) {
      return;
    }

    hasAutoDownloaded.current = true;
    downloadUpdate();
  }, [hasUpdate, hasPendingUpdate, downloadUpdate]);

  useEffect(() => {
    if (!isCritical || !hasPendingUpdate || hasScheduledReload.current) {
      return;
    }

    hasScheduledReload.current = true;
    const timer = setTimeout(applyUpdate, CRITICAL_RELOAD_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isCritical, hasPendingUpdate, applyUpdate]);
}
