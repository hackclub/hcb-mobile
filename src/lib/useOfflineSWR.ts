import useSWR, { SWRConfiguration, SWRResponse } from "swr";

import { useOffline } from "./useOffline";

interface HTTPError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

/**
 * Custom SWR hook that handles offline scenarios gracefully
 * - Only fetches when online
 * - Preserves cached data when offline
 * - Provides better error handling for network issues
 * - Automatically retries when connection is restored
 */
export function useOfflineSWR<Data, Error = unknown>(
  key: string | null | undefined,
  options?: SWRConfiguration<Data, Error> & {
    fetchWhenOffline?: boolean;
  },
): SWRResponse<Data, Error> {
  const { isOnline } = useOffline();
  const { fetchWhenOffline = false, ...swrOptions } = options || {};

  const shouldFetch = fetchWhenOffline || isOnline;
  const requestKey = shouldFetch ? key : null;

  return useSWR<Data, Error>(requestKey, {
    revalidateOnFocus: isOnline,
    revalidateOnReconnect: true,
    shouldRetryOnError: isOnline,
    keepPreviousData: true,
    errorRetryCount: isOnline ? 3 : 0,
    errorRetryInterval: 1000,
    onError: (err, key, config) => {
      if (
        isOnline &&
        err instanceof Error &&
        err.name !== "AbortError" &&
        err.name !== "NetworkError"
      ) {
        const context = { key, isOnline };
        if (swrOptions?.onError) {
          swrOptions.onError(err, key, config);
        } else {
          console.error("SWR fetch error:", err, { context });
        }
      }
    },
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      if (!isOnline) {
        return;
      }

      const errorWithStatus = error as HTTPError;
      const status =
        errorWithStatus?.status || errorWithStatus?.response?.status;

      if (status === 401 || status === 403) {
        console.log(
          `useOfflineSWR: Not retrying ${key} due to auth error (${status})`,
        );
        return;
      }

      if (status === 404) {
        return;
      }

      if (retryCount >= 3) return;

      // Exponential backoff
      const timeout = Math.min(1000 * Math.pow(2, retryCount), 5000);
      setTimeout(() => revalidate({ retryCount }), timeout);
    },

    ...swrOptions,
  });
}

export default useOfflineSWR;
