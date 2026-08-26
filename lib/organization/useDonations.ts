import { useMemo } from "react";
import { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

import { Donation, DonationStats, DonationStatus } from "../types/Donation";
import { PaginatedResponse } from "../types/HcbApiObject";

const PAGE_SIZE = 35;

export interface DonationFilters {
  status?: DonationStatus;
}

// The donations index adds an optional `stats` block (only when
// `expand=stats` is requested) on top of the standard paginated shape.
interface DonationsPage extends PaginatedResponse<Donation> {
  stats?: DonationStats;
}

export function getKey(orgId: string, filters?: DonationFilters) {
  return (index: number, previousPageData?: DonationsPage) => {
    if (previousPageData && previousPageData.has_more === false) return null;

    const parts = [`organization_id=${orgId}`, `limit=${PAGE_SIZE}`];
    // Stats are aggregate (unaffected by pagination) — request them once.
    if (index === 0) parts.push("expand=stats");
    if (filters?.status) parts.push(`status=${filters.status}`);

    let url = `donations?${parts.join("&")}`;

    if (index > 0) {
      const prev = previousPageData!;
      url += `&after=${prev.data[prev.data.length - 1].id}`;
    }

    return url;
  };
}

export default function useDonations(orgId: string, filters?: DonationFilters) {
  const { fetcher } = useSWRConfig();

  const infiniteFetcher = (url: string): Promise<DonationsPage> => {
    if (!fetcher) throw new Error("Fetcher not available");
    return fetcher(url) as Promise<DonationsPage>;
  };

  const keyFn = orgId ? getKey(orgId, filters) : () => null;

  const { data, size, setSize, isLoading, error, mutate } =
    useSWRInfinite<DonationsPage>(keyFn, infiniteFetcher);

  const donations: Donation[] = useMemo(
    () => data?.flatMap((d) => d?.data ?? []) ?? [],
    [data],
  );

  const stats = data?.[0]?.stats;
  const totalCount = data?.[0]?.total_count ?? donations.length;

  const isLoadingMore =
    isLoading || (size > 0 && !!data && typeof data[size - 1] === "undefined");
  const isEmpty = donations.length === 0;
  const isReachingEnd =
    isEmpty || (!!data && data[data.length - 1]?.has_more === false);

  return {
    donations,
    stats,
    totalCount,
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
