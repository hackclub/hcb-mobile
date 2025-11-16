import { useEffect, useRef } from "react";
import useSWR, { SWRConfiguration, SWRResponse } from "swr";

import { useOffline } from "./useOffline";

interface HTTPError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

/**
 * Custom SWR hook that handles offline scenarios gracefully and aggressively revalidates
 */
export function useOfflineSWR<Data, Error = unknown>(
  key: string | null | undefined,
  options?: SWRConfiguration<Data, Error> & {
    fetchWhenOffline?: boolean;
  },
): SWRResponse<Data, Error> {
  const { isOnline } = useOffline();
  const { fetchWhenOffline = false, ...swrOptions } = options || {};
  const wasOnlineRef = useRef(isOnline);

  const shouldFetch = fetchWhenOffline || isOnline;
  const requestKey = shouldFetch ? key : null;

  const swrResponse = useSWR<Data, Error>(requestKey, {
    revalidateOnFocus: isOnline,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    shouldRetryOnError: isOnline,
    keepPreviousData: true,
    errorRetryCount: isOnline ? 5 : 0,
    errorRetryInterval: 500,
    dedupingInterval: swrOptions?.dedupingInterval ?? 1000,
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

      if (status === 404) {
        return;
      }
      if (status && status >= 400 && status < 500 && status !== 429) {
        return;
      }

      if (retryCount >= 5) return;

      const baseTimeout = 500 * Math.pow(1.5, retryCount);
      const jitter = Math.random() * 200;
      const timeout = Math.min(baseTimeout + jitter, 5000);

      setTimeout(() => {
        console.log(`Retrying fetch for ${key} (attempt ${retryCount + 1})`);
        revalidate({ retryCount });
      }, timeout);
    },

    ...swrOptions,
  });

  const mutate = swrResponse.mutate;
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline && key) {
      console.log(`Connection restored, revalidating ${key}`);
      mutate();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, key, mutate]);

  return swrResponse;
}

export default useOfflineSWR;
