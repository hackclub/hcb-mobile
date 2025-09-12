import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import { useState, useEffect, useRef, useCallback } from "react";

import { logError } from "./errorUtils";

interface UseStripeTerminalInitOptions {
  organizationId?: string;
  enabled?: boolean;
}

interface UseStripeTerminalInitResult {
  isInitialized: boolean;
  isInitializing: boolean;
  supportsTapToPay: boolean;
  error: Error | null;
  retry: () => void;
}

let globalInitializationPromise: Promise<boolean> | null = null;
let globalInitializationState = {
  isInitialized: false,
  supportsTapToPay: false,
  error: null as Error | null,
};
let hasLoggedWaiting = false;

// Reset function to clear global state on app restart
export function resetStripeTerminalInitialization() {
  console.log("Resetting Stripe Terminal initialization state");
  globalInitializationPromise = null;
  hasLoggedWaiting = false;
  globalInitializationState = {
    isInitialized: false,
    supportsTapToPay: false,
    error: null,
  };
}

export function useStripeTerminalInit(
  options: UseStripeTerminalInitOptions = {},
): UseStripeTerminalInitResult {
  const { organizationId, enabled = true } = options;
  const terminal = useStripeTerminal();

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

  const initializationAttempted = useRef(false);

  const initializeTerminal = useCallback(async (): Promise<boolean> => {
    if (globalInitializationPromise) {
      if (!hasLoggedWaiting) {
        console.log("Waiting for existing Stripe Terminal initialization...");
        hasLoggedWaiting = true;
      }
      return await globalInitializationPromise;
    }

    if (globalInitializationState.isInitialized) {
      // Only log this once per app session
      if (!hasLoggedWaiting) {
        console.log("Stripe Terminal already initialized, skipping...");
      }
      return true;
    }

    console.log("Starting new Stripe Terminal initialization...");
    globalInitializationPromise = (async () => {
      try {
        if (!terminal) {
          const error = new Error("Terminal instance is null");
          logError("Stripe Terminal not available", error, {
            context: { organizationId },
          });
          globalInitializationState = {
            isInitialized: false,
            supportsTapToPay: false,
            error,
          };
          return false;
        }

        // Always initialize the terminal, even if we have cached results
        // This ensures the SDK is properly initialized on each app launch
        console.log("Initializing Stripe Terminal SDK...");
        await terminal.initialize();
        console.log("Stripe Terminal SDK initialized successfully");

        // Check cached results for tap-to-pay support to avoid expensive checks
        const cachedTapToPayEnabled =
          await AsyncStorage.getItem("isTapToPayEnabled");
        let tapToPaySupported: boolean;

        if (cachedTapToPayEnabled === "true") {
          tapToPaySupported = true;
        } else if (cachedTapToPayEnabled === "false") {
          tapToPaySupported = false;
        } else {
          // Only check tap-to-pay support if not cached
          const supported = await terminal.supportsReadersOfType({
            deviceType: "tapToPay",
            discoveryMethod: "tapToPay",
          });
          tapToPaySupported = !!(supported?.readerSupportResult || supported);
          // Cache the result for future use
          await AsyncStorage.setItem(
            "isTapToPayEnabled",
            tapToPaySupported ? "true" : "false",
          );
        }

        globalInitializationState = {
          isInitialized: true,
          supportsTapToPay: tapToPaySupported,
          error: null,
        };

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Stripe Terminal initialization failed:", err);
        logError("Stripe Terminal initialization error", err, {
          context: { organizationId },
        });

        globalInitializationState = {
          isInitialized: false,
          supportsTapToPay: false,
          error: err,
        };

        return false;
      } finally {
        // Clear the global promise so future calls can create a new one
        globalInitializationPromise = null;
      }
    })();

    return await globalInitializationPromise;
  }, [terminal, organizationId]);

  const retry = () => {
    console.log("Retrying Stripe Terminal initialization...");
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
    };
  };

  useEffect(() => {
    if (!enabled || initializationAttempted.current) {
      return;
    }

    if (globalInitializationState.isInitialized) {
      setIsInitialized(true);
      setSupportsTapToPay(globalInitializationState.supportsTapToPay);
      setError(globalInitializationState.error);
      return;
    }

    initializationAttempted.current = true;
    setIsInitializing(true);

    initializeTerminal()
      .then((_success) => {
        setIsInitialized(globalInitializationState.isInitialized);
        setSupportsTapToPay(globalInitializationState.supportsTapToPay);
        setError(globalInitializationState.error);
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        setIsInitialized(false);
        setSupportsTapToPay(false);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [enabled, terminal, organizationId, initializeTerminal]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        isInitialized !== globalInitializationState.isInitialized ||
        supportsTapToPay !== globalInitializationState.supportsTapToPay ||
        error !== globalInitializationState.error
      ) {
        setIsInitialized(globalInitializationState.isInitialized);
        setSupportsTapToPay(globalInitializationState.supportsTapToPay);
        setError(globalInitializationState.error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isInitialized, supportsTapToPay, error]);

  return {
    isInitialized,
    isInitializing,
    supportsTapToPay,
    error,
    retry,
  };
}
