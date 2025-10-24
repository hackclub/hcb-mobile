import { useMemo } from "react";
import { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

import { PaginatedResponse } from "../types/HcbApiObject";
import Transaction from "../types/Transaction";

const PAGE_SIZE = 35;

export function getKey(orgId: string, prefix: string) {
  return (
    index: number,
    previousPageData?: PaginatedResponse<Transaction> | undefined,
  ) => {
    if (previousPageData?.has_more === false) return null;

    if (index === 0)
      return `${prefix}/${orgId}/transactions?limit=${PAGE_SIZE}`;

    return `${prefix}/${orgId}/transactions?limit=${PAGE_SIZE}&after=${
      previousPageData!.data[previousPageData!.data.length - 1].id
    }`;
  };
}

export function getMissingReceiptKey() {
  return (
    index: number,
    previousPageData?: PaginatedResponse<Transaction> | undefined,
  ) => {
    if (previousPageData?.has_more === false) return null;

    if (index === 0)
      return `user/transactions/missing_receipt?limit=${PAGE_SIZE}`;

    return `user/transactions/missing_receipt?limit=${PAGE_SIZE}&after=${
      previousPageData!.data[previousPageData!.data.length - 1].id
    }`;
  };
}

export default function useTransactions(id: string, prefix: string) {
  if (!id || !prefix) {
    throw new Error("id and prefix are required");
  }

  const { fetcher } = useSWRConfig();

  const infiniteFetcher = (
    url: string,
  ): Promise<PaginatedResponse<Transaction>> => {
    if (!fetcher) throw new Error("Fetcher not available");
    return fetcher(url) as Promise<PaginatedResponse<Transaction>>;
  };

  const { data, size, setSize, isLoading, error } = useSWRInfinite<
    PaginatedResponse<Transaction>
  >(getKey(id, prefix), infiniteFetcher);

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
    error,
    loadMore() {
      if (isLoadingMore || isReachingEnd) return;
      setSize((s) => s + 1);
    },
  };
}

export function useMissingReceiptTransactions() {
  const { fetcher } = useSWRConfig();

  const infiniteFetcher = (
    url: string,
  ): Promise<PaginatedResponse<Transaction>> => {
    if (!fetcher) throw new Error("Fetcher not available");
    return fetcher(url) as Promise<PaginatedResponse<Transaction>>;
  };

  const { data, size, setSize, isLoading, error } = useSWRInfinite<
    PaginatedResponse<Transaction>
  >(getMissingReceiptKey(), infiniteFetcher);

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
    error,
    loadMore() {
      if (isLoadingMore || isReachingEnd) return;
      setSize((s) => s + 1);
    },
  };
}
