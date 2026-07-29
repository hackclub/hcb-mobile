import { PropsWithChildren } from "react";
import { SWRConfig } from "swr";

import { getClient } from "@/lib/client";
import log from "@/lib/log";
import { CacheProvider } from "@/lib/providers/cacheProvider";
import { describeApiError } from "@/lib/sentry/apiErrors";
import { tokenManager } from "@/lib/tokenManager";

interface HTTPError extends Error {
  status?: number;
  response?: { status?: number };
}

/**
 * The app's single `SWRConfig`.
 *
 * This MUST be the only config in the tree that passes `provider`. SWR keys its
 * global state by provider identity and hands ownership to whichever config
 * renders first: that one gets an `unmount` that calls
 * `SWRGlobalState.delete(provider)`, while any later config sharing the same
 * provider silently gets a handle with no lifecycle of its own. So when the
 * owner unmounted, the survivor was left holding a deregistered cache and the
 * next `useSWR` crashed destructuring `SWRGlobalState.get(cache)`.
 *
 * That is exactly what happened with the receipt bin: `receipt-selection` is a
 * sibling of `(app)`, so opening it tore down the `(app)` group — and its
 * config owned the provider. Mounting one config above both groups keeps
 * ownership tied to the root, which never unmounts, and still gives every route
 * the same cache so `mutate` from either side is visible to the other.
 */
export default function AppSWRConfig({
  cache,
  children,
}: PropsWithChildren<{ cache: CacheProvider }>) {
  return (
    <SWRConfig
      value={{
        provider: () => cache,
        fetcher: (url: string, options?: RequestInit) =>
          getClient()(url, options).json(),
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 5000,
        shouldRetryOnError: true,
        keepPreviousData: true,
        errorRetryCount: 5,
        errorRetryInterval: 500,
        refreshInterval: 0,
        loadingTimeout: 3000,
        focusThrottleInterval: 10000,
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // No session to retry with — the login redirect is already in flight,
          // so retrying just repeats a certain failure.
          if (error instanceof Error && error.name === "UnauthenticatedError") {
            return;
          }

          const errorWithStatus = error as HTTPError;
          const status =
            errorWithStatus?.status || errorWithStatus?.response?.status;

          if (status === 404) {
            return;
          }

          // Retry a 401 while a session token still exists: the token refresh
          // is likely still catching up after a transient failure. Once logged
          // out (no token), stop retrying.
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
        onError: (error, key) => {
          if (describeApiError(error)) return;
          if (
            error instanceof Error &&
            (error.name === "AbortError" ||
              error.name === "NetworkError" ||
              error.name === "UnauthenticatedError")
          ) {
            return;
          }
          log.exception(error, {
            context: "SWR fetcher",
            attributes: { "swr.key": String(key) },
          });
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
