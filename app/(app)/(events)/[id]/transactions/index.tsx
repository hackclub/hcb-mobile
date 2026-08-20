import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import {
  useFocusEffect,
  useHeaderHeight,
  useTheme,
} from "expo-router/react-navigation";
import groupBy from "lodash/groupBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import AccessDenied from "@/components/organizations/AccessDenied";
import { EmptyState } from "@/components/organizations/EmptyState";
import Header from "@/components/organizations/Header";
import { LoadingSkeleton } from "@/components/organizations/LoadingSkeleton";
import OfflineNoData from "@/components/organizations/OfflineNoData";
import PlaygroundBanner from "@/components/organizations/PlaygroundBanner";
import SectionHeader from "@/components/organizations/SectionHeader";
import TransactionWrapper from "@/components/organizations/TransactionWrapper";
import useTransactions from "@/lib/organization/useTransactions";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import ITransaction, { TransactionWithoutId } from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { renderDate } from "@/utils/format";
import { addPendingFeeToTransactions } from "@/utils/org";

// FlashList item types
type ListItemType =
  | { type: "header"; title: string }
  | {
      type: "group";
      title: string;
      transactions: TransactionWithoutId[];
    };

export default function Page() {
  const params = useLocalSearchParams<{ id: string; fallbackData?: string }>();
  const { isOnline } = useOffline();

  const {
    data: organization,
    error: organizationError,
    isLoading: organizationLoading,
    mutate: mutateOrganization,
  } = useOfflineSWR<Organization | OrganizationExpanded>(
    `organizations/${params.id}`,
    {
      fallbackData: params.fallbackData
        ? (JSON.parse(params.fallbackData) as
            | Organization
            | OrganizationExpanded)
        : undefined,
      onError: (err) => {
        console.error("Error fetching organization:", err, {
          context: { orgId: params.id, isOnline },
        });
      },
    },
  );

  const { data: user, isLoading: userLoading } = useOfflineSWR<User>("user");

  const playgroundMode = useMemo(
    () => organization?.playground_mode,
    [organization],
  );
  const isAccessDenied = useMemo(
    () => organizationError?.toString().includes("403"),
    [organizationError],
  );

  const {
    transactions: _transactions,
    isLoadingMore,
    loadMore,
    isLoading,
    mutate: mutateTransactions,
  } = useTransactions(params.id, "organizations");
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (organizationError?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationError, mutateOrganization]);

  const { bottom: tabBarSize } = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const headerHeight = useHeaderHeight();
  const { colors: themeColors } = useTheme();

  const transactions = useMemo(
    () => addPendingFeeToTransactions(_transactions, organization),
    [_transactions, organization],
  );

  const sections: { title: string; data: TransactionWithoutId[] }[] = useMemo(
    () =>
      Object.entries(
        groupBy(transactions, (t) =>
          t?.pending ? "Pending" : renderDate(t?.date),
        ),
      ).map(([title, data]) => ({
        title,
        data,
      })),
    [transactions],
  );

  const { flatListData } = useMemo(() => {
    const result: ListItemType[] = [];
    const headerIndices: number[] = [];

    sections.forEach((section) => {
      headerIndices.push(result.length);
      result.push({ type: "header", title: section.title });
      // Render each date group as a single cell so its rows share one native
      // view. Separate per-row cells leave a gap between them on Android that
      // is wider than on iOS.
      result.push({
        type: "group",
        title: section.title,
        transactions: section.data,
      });
    });

    return { flatListData: result, stickyHeaderIndices: headerIndices };
  }, [sections]);

  const onRefresh = useCallback(
    async (showRefreshIndicator = true) => {
      if (!isOnline || isRefreshingRef.current || isAccessDenied) return;

      isRefreshingRef.current = true;
      if (showRefreshIndicator) {
        setRefreshing(true);
      }
      try {
        await mutate(
          (key) =>
            typeof key === "string" &&
            key.startsWith(`organizations/${params.id}/transactions`),
        );
        await mutateTransactions();
        await mutateOrganization();
      } catch (err) {
        const e = err as Error | undefined;
        if (e?.name !== "AbortError" && e?.name !== "NetworkError") {
          console.error("Error refreshing organization data:", err);
        }
      } finally {
        isRefreshingRef.current = false;
        if (showRefreshIndicator) {
          setRefreshing(false);
        }
      }
    },
    [
      isOnline,
      params,
      mutate,
      mutateTransactions,
      mutateOrganization,
      isAccessDenied,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !isRefreshingRef.current && !isAccessDenied) {
        onRefresh(false);
      }
    }, [onRefresh, isLoading, isAccessDenied]),
  );

  const renderListFooter = useCallback(() => {
    if (isLoadingMore && !isLoading && !playgroundMode) {
      return (
        <View style={{ padding: 20, alignItems: "center" }}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      );
    }
    return null;
  }, [isLoadingMore, isLoading, playgroundMode, themeColors.primary]);

  const renderListHeader = useCallback(() => {
    if (!organization) return null;

    return (
      <View style={{ paddingTop: 20 }}>
        {playgroundMode && (
          <View style={{ paddingHorizontal: 20 }}>
            <PlaygroundBanner />
          </View>
        )}
        <View style={{ paddingHorizontal: 20 }}>
          <Header organization={organization} showChart={false} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {isLoading && <LoadingSkeleton />}
          {!isLoading && sections.length === 0 && (
            <EmptyState isOnline={isOnline} />
          )}
        </View>
      </View>
    );
  }, [playgroundMode, organization, isLoading, sections.length, isOnline]);

  const renderItem = useCallback(
    ({ item }: { item: ListItemType }) => {
      if (item.type === "header") {
        return <SectionHeader title={item.title} />;
      }

      return (
        <View style={{ paddingHorizontal: 20 }}>
          {/* Opaque card backing: transaction rows use translucent tints and
              are designed to sit on themeColors.card. Backing them here keeps
              row colors correct and makes the seams between rows render a
              consistent card color instead of the page background (which on
              Android rounds inconsistently and looks like varying gaps). */}
          <View
            style={{
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: themeColors.card,
            }}
          >
            {item.transactions.map((transaction, index) => (
              <TransactionWrapper
                key={(transaction as ITransaction).id || index}
                item={transaction as ITransaction}
                user={user}
                organization={organization}
                orgId={params.id as `org_${string}`}
                isFirst={index === 0}
                isLast={index === item.transactions.length - 1}
              />
            ))}
          </View>
        </View>
      );
    },
    [user, organization, params, themeColors.card],
  );

  const getItemType = useCallback((item: ListItemType) => item.type, []);

  const keyExtractor = useCallback((item: ListItemType) => {
    return `${item.type}-${item.title}`;
  }, []);

  if (organizationLoading || userLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          padding: 20,
          paddingTop: headerHeight + 20,
        }}
      >
        <LoadingSkeleton />
      </View>
    );
  }

  const isOfflineNoData = organizationError && !isOnline && !organization;

  if (isAccessDenied) {
    return <AccessDenied orgId={params.id} onGoBack={() => router.back()} />;
  }

  if (isOfflineNoData) {
    return (
      <OfflineNoData
        onRetry={() => {
          if (isOnline) {
            mutateOrganization();
          }
        }}
        onGoBack={() => router.back()}
      />
    );
  }

  return (
    <>
      {organization !== undefined ? (
        <FlashList
          data={flatListData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          // stickyHeaderIndices disabled — transparent nav bar causes headers to stick behind it
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingTop: headerInset,
            paddingBottom: tabBarSize + 20,
          }}
          showsVerticalScrollIndicator={true}
          drawDistance={400}
        />
      ) : (
        <View style={{ flex: 1, padding: 20, paddingTop: headerHeight + 20 }}>
          <LoadingSkeleton />
        </View>
      )}
    </>
  );
}
