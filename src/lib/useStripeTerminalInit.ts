import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useStripeTerminal,
  Reader,
} from "@stripe/stripe-terminal-react-native";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface UseStripeTerminalInitOptions {
  organizationId?: string;
  enabled?: boolean;
  enableReaderPreConnection?: boolean;
  enableSoftwareUpdates?: boolean;
}

interface UseStripeTerminalInitResult {
  isInitialized: boolean;
  isInitializing: boolean;
  supportsTapToPay: boolean;
  error: Error | null;
  retry: () => void;
  discoveredReaders: Reader.Type[];
  isUpdatingReaderSoftware: boolean;
  updateProgress: string | null;
}

let globalInitializationPromise: Promise<boolean> | null = null;
let globalInitializationState = {
  isInitialized: false,
  supportsTapToPay: false,
  error: null as Error | null,
  discoveredReaders: [] as Reader.Type[],
  isUpdatingReaderSoftware: false,
  updateProgress: null as string | null,
};
let hasLoggedWaiting = false;

// Reset function to clear global state on app restart
export function resetStripeTerminalInitialization() {
  globalInitializationPromise = null;
  hasLoggedWaiting = false;
  globalInitializationState = {
    isInitialized: false,
    supportsTapToPay: false,
    error: null,
    discoveredReaders: [],
    isUpdatingReaderSoftware: false,
    updateProgress: null,
  };
}

export function useStripeTerminalInit(
  options: UseStripeTerminalInitOptions = {},
): UseStripeTerminalInitResult {
  const {
    organizationId,
    enabled = true,
    enableReaderPreConnection = false,
    enableSoftwareUpdates = false,
  } = options;
  const terminal = useStripeTerminal({
    onUpdateDiscoveredReaders: enableReaderPreConnection
      ? (readers: Reader.Type[]) => {
          globalInitializationState.discoveredReaders = readers;
          setDiscoveredReaders(readers);
        }
      : undefined,
    onDidReportReaderSoftwareUpdateProgress: enableSoftwareUpdates
      ? (progress: string) => {
          globalInitializationState.updateProgress = progress;
          setUpdateProgress(progress);
        }
      : undefined,
    onDidReportAvailableUpdate: enableSoftwareUpdates
      ? async (_update) => {
          globalInitializationState.isUpdatingReaderSoftware = true;
          setIsUpdatingReaderSoftware(true);
          try {
            await terminal?.installAvailableUpdate();
          } catch (error) {
            console.error(
              "Failed to install Stripe Terminal software update",
              error,
              {
                context: { organizationId },
              },
            );
          } finally {
            globalInitializationState.isUpdatingReaderSoftware = false;
            globalInitializationState.updateProgress = null;
            setIsUpdatingReaderSoftware(false);
            setUpdateProgress(null);
          }
        }
      : undefined,
  });

  const [isInitialized, setIsInitialized] = useState(
    globalInitializationState.isInitialized,
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [supportsTapToPay, setSupportsTapToPay] = useState(
    globalInitializationState.supportsTapToPay,
  );
  const [error, setError] = useState<Error | null>(
    globalInitializationState.error,
  );
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader.Type[]>(
    globalInitializationState.discoveredReaders,
  );
  const [isUpdatingReaderSoftware, setIsUpdatingReaderSoftware] = useState(
    globalInitializationState.isUpdatingReaderSoftware,
  );
  const [updateProgress, setUpdateProgress] = useState<string | null>(
    globalInitializationState.updateProgress,
  );

  const initializationAttempted = useRef(false);

  const initializeTerminal = useCallback(async (): Promise<boolean> => {
    if (globalInitializationPromise) {
      if (!hasLoggedWaiting) {
        hasLoggedWaiting = true;
      }
      return await globalInitializationPromise;
    }

    if (globalInitializationState.isInitialized) {
      return true;
    }
    globalInitializationPromise = (async () => {
      try {
        if (!terminal) {
          const error = new Error("Terminal instance is null");
          console.error("Stripe Terminal not available", error, {
            context: { organizationId },
          });
          globalInitializationState = {
            isInitialized: false,
            supportsTapToPay: false,
            error,
            discoveredReaders: [],
            isUpdatingReaderSoftware: false,
            updateProgress: null,
          };
          return false;
        }

        await terminal.initialize();

        const cachedTapToPayEnabled =
          await AsyncStorage.getItem("isTapToPayEnabled");
        let tapToPaySupported: boolean;

        if (cachedTapToPayEnabled === "true") {
          tapToPaySupported = true;
        } else if (cachedTapToPayEnabled === "false") {
          tapToPaySupported = false;
        } else {
          const supported = await terminal.supportsReadersOfType({
            deviceType: "tapToPay",
            discoveryMethod: "tapToPay",
          });
          tapToPaySupported = !!(supported?.readerSupportResult || supported);
          await AsyncStorage.setItem(
            "isTapToPayEnabled",
            tapToPaySupported ? "true" : "false",
          );
        }

        if (enableReaderPreConnection && tapToPaySupported) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await terminal.discoverReaders({
              discoveryMethod: "tapToPay",
            });
          } catch (error) {
            console.warn(
              "Failed to discover readers during initialization:",
              error,
            );
          }
        }

        globalInitializationState = {
          isInitialized: true,
          supportsTapToPay: tapToPaySupported,
          error: null,
          discoveredReaders: globalInitializationState.discoveredReaders,
          isUpdatingReaderSoftware:
            globalInitializationState.isUpdatingReaderSoftware,
          updateProgress: globalInitializationState.updateProgress,
        };

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Stripe Terminal initialization error", err, {
          context: { organizationId },
        });

        globalInitializationState = {
          isInitialized: false,
          supportsTapToPay: false,
          error: err,
          discoveredReaders: [],
          isUpdatingReaderSoftware: false,
          updateProgress: null,
        };

        return false;
      } finally {
        globalInitializationPromise = null;
      }
    })();

    return await globalInitializationPromise;
  }, [terminal, organizationId, enableReaderPreConnection]);

  const retry = useCallback(() => {
    initializationAttempted.current = false;
    hasLoggedWaiting = false;
    setError(null);
    setIsInitialized(false);
    setSupportsTapToPay(false);
    globalInitializationPromise = null;
    globalInitializationState = {
      isInitialized: false,
      supportsTapToPay: false,
      error: null,
      discoveredReaders: [],
      isUpdatingReaderSoftware: false,
      updateProgress: null,
    };
  }, []);

  useEffect(() => {
    if (!enabled || initializationAttempted.current) {
      return;
    }

    if (globalInitializationState.isInitialized) {
      setIsInitialized(true);
      setSupportsTapToPay(globalInitializationState.supportsTapToPay);
      setError(globalInitializationState.error);
      setDiscoveredReaders(globalInitializationState.discoveredReaders);
      setIsUpdatingReaderSoftware(
        globalInitializationState.isUpdatingReaderSoftware,
      );
      setUpdateProgress(globalInitializationState.updateProgress);
      return;
    }

    initializationAttempted.current = true;
    setIsInitializing(true);

    initializeTerminal()
      .then((_success) => {
        setIsInitialized(globalInitializationState.isInitialized);
        setSupportsTapToPay(globalInitializationState.supportsTapToPay);
        setError(globalInitializationState.error);
        setDiscoveredReaders(globalInitializationState.discoveredReaders);
        setIsUpdatingReaderSoftware(
          globalInitializationState.isUpdatingReaderSoftware,
        );
        setUpdateProgress(globalInitializationState.updateProgress);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        setIsInitialized(false);
        setSupportsTapToPay(false);
        setDiscoveredReaders([]);
        setIsUpdatingReaderSoftware(false);
        setUpdateProgress(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [enabled, terminal, organizationId, initializeTerminal]);

  useEffect(() => {
    const interval = setInterval(() => {
      // check if discovered readers have actually changed
      const readersChanged = () => {
        if (
          discoveredReaders.length !==
          globalInitializationState.discoveredReaders.length
        ) {
          return true;
        }
        return discoveredReaders.some(
          (reader, index) =>
            reader.id !==
            globalInitializationState.discoveredReaders[index]?.id,
        );
      };

      if (
        isInitialized !== globalInitializationState.isInitialized ||
        supportsTapToPay !== globalInitializationState.supportsTapToPay ||
        error !== globalInitializationState.error ||
        readersChanged() ||
        isUpdatingReaderSoftware !==
          globalInitializationState.isUpdatingReaderSoftware ||
        updateProgress !== globalInitializationState.updateProgress
      ) {
        setIsInitialized(globalInitializationState.isInitialized);
        setSupportsTapToPay(globalInitializationState.supportsTapToPay);
        setError(globalInitializationState.error);
        setDiscoveredReaders(globalInitializationState.discoveredReaders);
        setIsUpdatingReaderSoftware(
          globalInitializationState.isUpdatingReaderSoftware,
        );
        setUpdateProgress(globalInitializationState.updateProgress);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [
    isInitialized,
    supportsTapToPay,
    error,
    discoveredReaders,
    isUpdatingReaderSoftware,
    updateProgress,
  ]);

  return useMemo(
    () => ({
      isInitialized,
      isInitializing,
      supportsTapToPay,
      error,
      retry,
      discoveredReaders,
      isUpdatingReaderSoftware,
      updateProgress,
    }),
    [
      isInitialized,
      isInitializing,
      supportsTapToPay,
      error,
      retry,
      discoveredReaders,
      isUpdatingReaderSoftware,
      updateProgress,
    ],
  );
}
