import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import groupBy from "lodash/groupBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
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
import TagChip from "@/components/tags/TagChip";
import { Text } from "@/components/Text";
import { filterCallbackStore } from "@/lib/filterCallbackStore";
import useTransactions, {
  TransactionFilters,
} from "@/lib/organization/useTransactions";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import Tag from "@/lib/types/Tag";
import ITransaction, { TransactionWithoutId } from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate } from "@/utils/format";
import { addPendingFeeToTransactions } from "@/utils/org";

// FlashList item types
type ListItemType =
  | { type: "header"; title: string }
  | {
      type: "transaction";
      transaction: TransactionWithoutId;
      isFirst: boolean;
      isLast: boolean;
    };

function countActiveFilters(filters: TransactionFilters): number {
  let n = 0;
  if (filters.search) n++;
  if (filters.type) n++;
  if (filters.startDate || filters.endDate) n++;
  if (filters.minimumAmount || filters.maximumAmount) n++;
  if (filters.missingReceipts) n++;
  // tagId is shown separately as chips, not counted here
  return n;
}

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
  const { data: tags } = useOfflineSWR<Tag[]>(
    `tags?organization_id=${params.id}`,
  );

  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>({});

  const openFilterSheet = useCallback(() => {
    filterCallbackStore.register(setAppliedFilters);
    router.push({
      pathname: "/(app)/(events)/[id]/transactions/filter",
      params: {
        id: params.id,
        filters: JSON.stringify(appliedFilters),
      },
    });
  }, [appliedFilters, params.id]);

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
  } = useTransactions(params.id, "organizations", appliedFilters);
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (organizationError?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationError, mutateOrganization]);

  const { bottom: tabBarSize } = useSafeAreaInsets();
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

      section.data.forEach((item, index) => {
        result.push({
          type: "transaction",
          transaction: item as TransactionWithoutId,
          isFirst: index === 0,
          isLast: index === section.data.length - 1,
        });
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

  const activeFilterCount = countActiveFilters(appliedFilters);

  const renderListHeader = useCallback(() => {
    if (!organization) return null;

    const hasTags = tags && tags.length > 0;
    const hasActiveFilters = activeFilterCount > 0 || !!appliedFilters.tagId;

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

        {/* Filter bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 12,
            gap: 8,
          }}
        >
          {/* Tag chips */}
          {hasTags && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 6 }}
            >
              {tags.map((tag) => (
                <Pressable
                  key={tag.id}
                  onPress={() =>
                    setAppliedFilters((f) => ({
                      ...f,
                      tagId: f.tagId === tag.id ? undefined : tag.id,
                    }))
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <TagChip tag={tag} active={appliedFilters.tagId === tag.id} />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Filter button */}
          <Pressable
            onPress={openFilterSheet}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor:
                activeFilterCount > 0 ? palette.primary : themeColors.card,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={activeFilterCount > 0 ? "#fff" : palette.muted}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: activeFilterCount > 0 ? "#fff" : themeColors.text,
              }}
            >
              {activeFilterCount > 0
                ? `Filters (${activeFilterCount})`
                : "Filters"}
            </Text>
          </Pressable>
        </View>

        {/* Active filter pills (clear individual filters) */}
        {hasActiveFilters && (
          <Pressable
            onPress={() => setAppliedFilters({})}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginHorizontal: 20,
              marginTop: 8,
              alignSelf: "flex-start",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="close-circle" size={14} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: 12 }}>
              Clear all filters
            </Text>
          </Pressable>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          {isLoading && <LoadingSkeleton />}
          {!isLoading && sections.length === 0 && (
            <EmptyState isOnline={isOnline} />
          )}
        </View>
      </View>
    );
  }, [
    playgroundMode,
    organization,
    isLoading,
    sections.length,
    isOnline,
    tags,
    appliedFilters,
    activeFilterCount,
    themeColors,
    openFilterSheet,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: ListItemType }) => {
      if (item.type === "header") {
        return <SectionHeader title={item.title} />;
      }

      return (
        <View style={{ paddingHorizontal: 20 }}>
          <TransactionWrapper
            item={item.transaction as ITransaction}
            user={user}
            organization={organization}
            orgId={params.id as `org_${string}`}
            isFirst={item.isFirst}
            isLast={item.isLast}
          />
        </View>
      );
    },
    [user, organization, params],
  );

  const getItemType = useCallback((item: ListItemType) => {
    if (item.type === "header") {
      return "header";
    }

    const transaction = item.transaction as TransactionWithoutId;
    return `transaction-${transaction.code}`;
  }, []);

  const keyExtractor = useCallback((item: ListItemType, index: number) => {
    if (item.type === "header") {
      return `header-${item.title}`;
    }
    if (
      "transaction" in item &&
      "id" in item.transaction &&
      item.transaction.id
    ) {
      return item.transaction.id;
    }
    return `item-${index}`;
  }, []);

  if (organizationLoading || userLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          padding: 20,
          marginTop: 20,
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
            paddingBottom: tabBarSize + 20,
          }}
          showsVerticalScrollIndicator={true}
          drawDistance={400}
        />
      ) : (
        <View style={{ flex: 1, marginTop: 20 }}>
          <LoadingSkeleton />
        </View>
      )}
    </>
  );
}
