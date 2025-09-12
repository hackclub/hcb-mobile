import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { useSWRConfig } from "swr";

import { PaginatedResponse } from "../types/HcbApiObject";
import Transaction from "../types/Transaction";

const PAGE_SIZE = 35;

export function getKey(orgId: string) {
  return (
    index: number,
    previousPageData?: PaginatedResponse<Transaction> | undefined,
  ) => {
    if (previousPageData?.has_more === false) return null;

    if (index === 0)
      return `organizations/${orgId}/transactions?limit=${PAGE_SIZE}`;

    return `organizations/${orgId}/transactions?limit=${PAGE_SIZE}&after=${
      previousPageData!.data[previousPageData!.data.length - 1].id
    }`;
  };
}

export default function useTransactions(orgId: string) {
  const { fetcher } = useSWRConfig();
  
  // Create a fetcher specifically for useSWRInfinite that handles the key properly
  const infiniteFetcher = (url: string | null) => {
    if (!url) return null;
    return fetcher(url);
  };
  
  const { data, size, setSize, isLoading } = useSWRInfinite(getKey(orgId), infiniteFetcher);

  const transactions: Transaction[] = useMemo(
    () => data?.flatMap((d) => d?.data) || [],
    [data],
  );
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = transactions.length == 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.has_more === false);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore() {
      if (isLoadingMore || isReachingEnd) return;
      setSize((s) => s + 1);
    },
  };
}
