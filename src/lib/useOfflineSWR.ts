import useSWR, { SWRConfiguration, SWRResponse } from "swr";

import { logError } from "./errorUtils";
import { useOffline } from "./useOffline";

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
          logError("SWR fetch error:", err, { context });
        }
      }
    },

    ...swrOptions,
  });
}

export default useOfflineSWR;
