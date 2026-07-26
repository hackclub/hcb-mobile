import { PropsWithChildren } from "react";
import { SWRConfig } from "swr";

import { getClient } from "@/lib/client";
import cacheProvider from "@/lib/providers/cacheProvider";

interface HTTPError extends Error {
  status?: number;
  response?: { status?: number };
}

/**
 * SWR context for routes that live OUTSIDE the `(app)` group.
 *
 * `(app)/_layout.tsx` installs the app's `SWRConfig`, so anything rendered by
 * it inherits a fetcher and the persistent cache. Root-level routes
 * (`receipt-selection`, `share-intent`) are siblings of `(app)`, rendered by
 * the root `<Slot />`, so they had neither: SWR bails out of revalidation
 * entirely when no fetcher is in context, which made `useSWR("receipts")`
 * return `undefined` forever and the receipt bin look empty while the Receipts
 * tab showed the same key populated.
 *
 * `provider` returns the same module singleton the `(app)` tree uses, so the
 * two contexts share one cache and `mutate` from either side is visible to the
 * other.
 */
export default function RootSWRConfig({ children }: PropsWithChildren) {
  return (
    <SWRConfig
      value={{
        provider: () => cacheProvider,
        fetcher: (url: string, options?: RequestInit) =>
          getClient()(url, options).json(),
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          const status =
            (error as HTTPError)?.status ??
            (error as HTTPError)?.response?.status;
          // 4xx won't fix itself on retry; 429 and 5xx might.
          if (status && status >= 400 && status < 500 && status !== 429) return;
          if (retryCount >= 3) return;
          setTimeout(
            () => revalidate({ retryCount }),
            Math.min(500 * Math.pow(1.5, retryCount), 5000),
          );
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
