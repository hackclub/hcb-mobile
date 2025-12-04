import {
  useUpdates,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from "expo-updates";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

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
      await reloadAsync({
        reloadScreenOptions: {
          backgroundColor: "#ec3750",
          image:
            Platform.OS === "ios"
              ? require("../../assets/splash-ios.png")
              : require("../../assets/splash-android.png"),
          imageFullScreen: Platform.OS === "ios" ? true : false,
          imageResizeMode: Platform.OS === "ios" ? "contain" : "cover",
          spinner: { enabled: false },
        },
      });
    } catch (error) {
      console.error("Error applying update:", error);
    }
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
    if (
      isCritical &&
      hasUpdate &&
      !hasPendingUpdate &&
      !hasAutoDownloaded.current
    ) {
      console.log("Critical update detected - auto-downloading");
      hasAutoDownloaded.current = true;
      downloadUpdate();
    }
  }, [isCritical, hasUpdate, hasPendingUpdate, downloadUpdate]);

  useEffect(() => {
    if (isCritical && hasPendingUpdate) {
      console.log("Critical update downloaded - applying in 2 seconds");
      setTimeout(() => {
        applyUpdate();
      }, 2000);
    }
  }, [isCritical, hasPendingUpdate, applyUpdate]);

  useEffect(() => {
    if (
      hasUpdate &&
      !isCritical &&
      !hasPendingUpdate &&
      !hasAutoDownloaded.current
    ) {
      hasAutoDownloaded.current = true;
      downloadUpdate();
    }
  }, [hasUpdate, isCritical, hasPendingUpdate, downloadUpdate]);
}
