import { useEffect, useRef } from "react";
import useSWR, { SWRConfiguration, SWRResponse } from "swr";

import { tokenManager } from "./tokenManager";
import { useOffline } from "./useOffline";

interface HTTPError extends Error {
  status?: number;
  response?: {
    status?: number;
  };
}

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
    dedupingInterval: swrOptions?.dedupingInterval ?? 5000,
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
      // A 401 while we still hold a session token means a token refresh is
      // still catching up (e.g. after a transient refresh failure) — retry
      // with backoff so the request recovers. Once the session is actually
      // gone, tokenManager.getToken() is null and we stop.
      const isRecoverable401 = status === 401 && !!tokenManager.getToken();
      if (
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 429 &&
        !isRecoverable401
      ) {
        return;
      }

      if (retryCount >= 5) return;

      const baseTimeout = 500 * Math.pow(1.5, retryCount);
      const jitter = Math.random() * 200;
      const timeout = Math.min(baseTimeout + jitter, 5000);

      setTimeout(() => {
        revalidate({ retryCount });
      }, timeout);
    },

    ...swrOptions,
  });

  const mutate = swrResponse.mutate;
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline && key) {
      mutate();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, key, mutate]);

  return swrResponse;
}

export default useOfflineSWR;
