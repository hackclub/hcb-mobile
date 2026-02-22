/* eslint-disable react/prop-types */
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useNavigation } from "expo-router";
import groupBy from "lodash/groupBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSWRConfig } from "swr";

import AccessDenied from "@/components/organizations/AccessDenied";
import { EmptyState } from "@/components/organizations/EmptyState";
import Header from "@/components/organizations/Header";
import { LoadingSkeleton } from "@/components/organizations/LoadingSkeleton";
import OfflineNoData from "@/components/organizations/OfflineNoData";
import PlaygroundBanner from "@/components/organizations/PlaygroundBanner";
import SectionHeader from "@/components/organizations/SectionHeader";
import TransactionWrapper from "@/components/organizations/TransactionWrapper";
import MockTransaction, {
  MockTransactionType,
} from "@/components/transaction/MockTransaction";
import MockTransactionEngine from "@/lib/organization/useMockTransactionEngine";
import useTransactions from "@/lib/organization/useTransactions";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import ITransaction, { TransactionWithoutId } from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { addPendingFeeToTransactions, renderDate } from "@/utils/util";

// FlashList item types
type ListItemType =
  | { type: "header"; title: string }
  | {
    type: "transaction";
    transaction: TransactionWithoutId;
    isFirst: boolean;
    isLast: boolean;
  }
  | {
    type: "mockTransaction";
    transaction: MockTransactionType;
    isFirst: boolean;
    isLast: boolean;
  };

export default function Page() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { isOnline } = useOffline();

  const {
    data: organization,
    error: organizationError,
    isLoading: organizationLoading,
    mutate: mutateOrganization,
  } = useOfflineSWR<Organization | OrganizationExpanded>(
    `organizations/${params.id}`,
    {
      fallbackData: params.fallbackData,
      onError: (err) => {
        console.error("Error fetching organization:", err, {
          context: { orgId: params.id, isOnline },
        });
      },
    },
  );

  const { data: user, isLoading: userLoading } = useOfflineSWR<User>("user");
  const [showMockData, setShowMockData] = useState(false);
  const playgroundMode = useMemo(
    () => organization?.playground_mode,
    [organization],
  );
  const organizationErrorStatus = useMemo(() => {
    return organizationError?.toString().includes("403");
  }, [organizationError]);
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
    if (organizationErrorStatus?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationErrorStatus, mutateOrganization]);

  const tabBarSize = useBottomTabBarHeight();
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

  const mockTransactions = useMemo(
    () => new MockTransactionEngine().generateMockTransactionList(),
    [],
  );
  const mockSections: { title: string; data: MockTransactionType[] }[] =
    useMemo(() => {
      return Object.entries(groupBy(mockTransactions, (t) => t.date))
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([title, data]) => ({
          title: renderDate(title),
          data,
        }));
    }, [mockTransactions]);

  const { flatListData, stickyHeaderIndices } = useMemo(() => {
    const sectionsToUse =
      playgroundMode && showMockData ? mockSections : sections;
    const result: ListItemType[] = [];
    const headerIndices: number[] = [];

    sectionsToUse.forEach((section) => {
      headerIndices.push(result.length);
      result.push({ type: "header", title: section.title });

      section.data.forEach((item, index) => {
        if (playgroundMode && showMockData) {
          result.push({
            type: "mockTransaction",
            transaction: item as MockTransactionType,
            isFirst: index === 0,
            isLast: index === section.data.length - 1,
          });
        } else {
          result.push({
            type: "transaction",
            transaction: item as TransactionWithoutId,
            isFirst: index === 0,
            isLast: index === section.data.length - 1,
          });
        }
      });
    });

    return { flatListData: result, stickyHeaderIndices: headerIndices };
  }, [sections, mockSections, playgroundMode, showMockData]);

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
        if (err?.name !== "AbortError" && err?.name !== "NetworkError") {
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
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {playgroundMode && <PlaygroundBanner />}
        <Header
          organization={organization}
          showMockData={showMockData}
          setShowMockData={setShowMockData}
        />
        {isLoading && <LoadingSkeleton />}
        {!isLoading && sections.length === 0 && !showMockData && (
          <EmptyState isOnline={isOnline} />
        )}
      </View>
    );
  }, [
    playgroundMode,
    organization,
    showMockData,
    isLoading,
    sections.length,
    isOnline,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: ListItemType }) => {
      if (item.type === "header") {
        return (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader title={item.title} />
          </View>
        );
      }

      if (item.type === "mockTransaction") {
        return (
          <MockTransaction
            transaction={item.transaction}
            top={item.isFirst}
            bottom={item.isLast}
          />
        );
      }

      return (
        <View style={{ paddingHorizontal: 20 }}>
          <TransactionWrapper
            item={item.transaction as ITransaction}
            user={user}
            organization={organization}
            navigation={navigation}
            orgId={params.id}
            isFirst={item.isFirst}
            isLast={item.isLast}
          />
        </View>
      );
    },
    [user, organization, navigation, params],
  );

  const getItemType = useCallback((item: ListItemType) => {
    if (item.type === "header") {
      return "header";
    }

    if (item.type === "mockTransaction") {
      return "mockTransaction";
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
        }}
      >
        <LoadingSkeleton />
      </View>
    );
  }

  // Check for offline with no cached data
  const isOfflineNoData = organizationError && !isOnline && !organization;

  if (isAccessDenied) {
    return (
      <AccessDenied orgId={params.id} onGoBack={() => navigation.goBack()} />
    );
  }

  if (isOfflineNoData) {
    return (
      <OfflineNoData
        onRetry={() => {
          if (isOnline) {
            mutateOrganization();
          }
        }}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {organization !== undefined ? (
        <FlashList
          data={flatListData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          stickyHeaderIndices={stickyHeaderIndices}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{
            paddingBottom: tabBarSize + 20,
          }}
          showsVerticalScrollIndicator={true}
          drawDistance={400}
        />
      ) : (
        <LoadingSkeleton />
      )}
    </View>
  );
}
