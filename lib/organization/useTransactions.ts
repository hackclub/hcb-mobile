import { useMemo } from "react";
import { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

import { PaginatedResponse } from "../types/HcbApiObject";
import Transaction from "../types/Transaction";

const PAGE_SIZE = 35;

export interface TransactionFilters {
  tagId?: string;
  search?: string;
  type?: "expenses" | "revenue";
  minimumAmount?: string;
  maximumAmount?: string;
  startDate?: string;
  endDate?: string;
  missingReceipts?: boolean;
}

function buildFilterParams(filters: TransactionFilters): string {
  const parts: string[] = [];
  if (filters.tagId) parts.push(`filters[tag_id]=${encodeURIComponent(filters.tagId)}`);
  if (filters.search?.trim()) parts.push(`filters[search]=${encodeURIComponent(filters.search.trim())}`);
  if (filters.type === "expenses") parts.push("filters[expenses]=true");
  if (filters.type === "revenue") parts.push("filters[revenue]=true");
  if (filters.minimumAmount) parts.push(`filters[minimum_amount]=${filters.minimumAmount}`);
  if (filters.maximumAmount) parts.push(`filters[maximum_amount]=${filters.maximumAmount}`);
  if (filters.startDate) parts.push(`filters[start_date]=${filters.startDate}`);
  if (filters.endDate) parts.push(`filters[end_date]=${filters.endDate}`);
  if (filters.missingReceipts) parts.push("filters[missing_receipts]=true");
  return parts.length > 0 ? "&" + parts.join("&") : "";
}

export function getKey(orgId: string, prefix: string, filters?: TransactionFilters) {
  return (
    index: number,
    previousPageData?: PaginatedResponse<Transaction> | undefined,
  ) => {
    if (previousPageData?.has_more === false) return null;

    const filterStr = filters ? buildFilterParams(filters) : "";

    if (index === 0)
      return `${prefix}/${orgId}/transactions?limit=${PAGE_SIZE}${filterStr}`;

    return `${prefix}/${orgId}/transactions?limit=${PAGE_SIZE}&after=${
      previousPageData!.data[previousPageData!.data.length - 1].id
    }${filterStr}`;
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

export default function useTransactions(
  id: string,
  prefix: string,
  filters?: TransactionFilters,
) {
  const { fetcher } = useSWRConfig();

  const infiniteFetcher = (
    url: string,
  ): Promise<PaginatedResponse<Transaction>> => {
    if (!fetcher) throw new Error("Fetcher not available");
    return fetcher(url) as Promise<PaginatedResponse<Transaction>>;
  };

  const keyFn = id && prefix ? getKey(id, prefix, filters) : () => null;

  const { data, size, setSize, isLoading, error, mutate } = useSWRInfinite<
    PaginatedResponse<Transaction>
  >(keyFn, infiniteFetcher);

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
    mutate: async () => {
      setSize(1);
      await mutate();
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
