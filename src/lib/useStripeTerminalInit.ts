import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { useState, useEffect, useRef, useCallback } from 'react';

import { logError } from './errorUtils';

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

export function useStripeTerminalInit(
  options: UseStripeTerminalInitOptions = {}
): UseStripeTerminalInitResult {
  const { organizationId, enabled = true } = options;
  const terminal = useStripeTerminal();
  
  const [isInitialized, setIsInitialized] = useState(globalInitializationState.isInitialized);
  const [isInitializing, setIsInitializing] = useState(false);
  const [supportsTapToPay, setSupportsTapToPay] = useState(globalInitializationState.supportsTapToPay);
  const [error, setError] = useState<Error | null>(globalInitializationState.error);
  
  const initializationAttempted = useRef(false);

  const initializeTerminal = useCallback(async (): Promise<boolean> => {
    if (globalInitializationPromise) {
      return await globalInitializationPromise;
    }

    globalInitializationPromise = (async () => {
      try {
        const cachedTapToPayEnabled = await AsyncStorage.getItem('isTapToPayEnabled');
        if (cachedTapToPayEnabled === 'true') {
          globalInitializationState = {
            isInitialized: true,
            supportsTapToPay: true,
            error: null,
          };
          return true;
        } else if (cachedTapToPayEnabled === 'false') {
          globalInitializationState = {
            isInitialized: true,
            supportsTapToPay: false,
            error: null,
          };
          return true;
        }

        if (!terminal) {
          const error = new Error('Terminal instance is null');
          logError('Stripe Terminal not available', error, {
            context: { organizationId },
          });
          globalInitializationState = {
            isInitialized: false,
            supportsTapToPay: false,
            error,
          };
          return false;
        }

        await terminal.initialize();
        
        const supported = await terminal.supportsReadersOfType({
          deviceType: 'tapToPay',
          discoveryMethod: 'tapToPay',
        });
        
        const tapToPaySupported = supported?.readerSupportResult || supported || false;
        
        // Cache the result
        await AsyncStorage.setItem('isTapToPayEnabled', tapToPaySupported ? 'true' : 'false');
        
        globalInitializationState = {
          isInitialized: true,
          supportsTapToPay: !!tapToPaySupported,
          error: null,
        };
        
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError('Stripe Terminal initialization error', err, {
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
    initializationAttempted.current = false;
    setError(null);
    setIsInitialized(false);
    setSupportsTapToPay(false);
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

  // Update local state when global state changes (from other components)
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
