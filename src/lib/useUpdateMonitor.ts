import {
  useUpdates,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from "expo-updates";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

const isUpdateCritical = (
  updatesSystem: ReturnType<typeof useUpdates>,
): boolean => {
  const { availableUpdate } = updatesSystem;

  const manifest = availableUpdate?.manifest as
    | { extra?: { message?: string } }
    | undefined;
  const message = manifest?.extra?.message?.toLowerCase() ?? "";

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
  const isCritical = hasUpdate && isUpdateCritical(updatesSystem);

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

  const downloadUpdate = async (): Promise<boolean> => {
    try {
      await fetchUpdateAsync();
      return true;
    } catch (error) {
      console.error("Error downloading update:", error);
      return false;
    }
  };

  const applyUpdate = async (): Promise<void> => {
    try {
      await reloadAsync();
    } catch (error) {
      console.error("Error applying update:", error);
    }
  };

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
  }, [isCritical, hasUpdate, hasPendingUpdate]);

  useEffect(() => {
    if (isCritical && hasPendingUpdate) {
      console.log("Critical update downloaded - applying in 2 seconds");
      setTimeout(() => {
        applyUpdate();
      }, 2000);
    }
  }, [isCritical, hasPendingUpdate]);

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
  }, [hasUpdate, isCritical, hasPendingUpdate]);
}
