import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import Transaction from "../types/Transaction";

const PAGE_SIZE = 25;

export default function useTransactions(orgId: string) {
  const { data, size, setSize, isLoading } = useSWRInfinite(
    (index, previousPageData) => {
      if (previousPageData?.has_more === false) return null;

      if (index === 0)
        return `/organizations/${orgId}/transactions?limit=${PAGE_SIZE}`;

      return `/organizations/${orgId}/transactions?limit=${PAGE_SIZE}&after=${
        previousPageData.data[previousPageData.data.length - 1].id
      }`;
    },
  );

  const transactions: Transaction[] = useMemo(
    () => data?.flatMap((d) => d.data) || [],
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
