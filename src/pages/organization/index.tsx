import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import groupBy from "lodash/groupBy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator, SectionList, Platform } from "react-native";
import { mutate } from "swr";

import AccessDenied from "../../components/organizations/AccessDenied";
import { EmptyState } from "../../components/organizations/EmptyState";
import Header from "../../components/organizations/Header";
import { LoadingSkeleton } from "../../components/organizations/LoadingSkeleton";
import Menu from "../../components/organizations/Menu";
import OfflineNoData from "../../components/organizations/OfflineNoData";
import PlaygroundBanner from "../../components/organizations/PlaygroundBanner";
import SectionHeader from "../../components/organizations/SectionHeader";
import TapToPayBanner from "../../components/organizations/TapToPayBanner";
import TransactionWrapper from "../../components/organizations/TransactionWrapper";
import MockTransaction, {
  MockTransactionType,
} from "../../components/transaction/MockTransaction";
import { StackParamList } from "../../lib/NavigatorParamList";
import MockTransactionEngine from "../../lib/organization/useMockTransactionEngine";
import useTransactions from "../../lib/organization/useTransactions";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import ITransaction, {
  TransactionWithoutId,
} from "../../lib/types/Transaction";
import User from "../../lib/types/User";
import { useOffline } from "../../lib/useOffline";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { useStripeTerminalInit } from "../../lib/useStripeTerminalInit";
import { addPendingFeeToTransactions, renderDate } from "../../utils/util";

type Props = NativeStackScreenProps<StackParamList, "Event">;

export default function OrganizationPage({
  route: {
    params: { orgId, organization: _organization },
  },
  navigation,
}: Props) {
  const { isOnline } = useOffline();

  const {
    data: organization,
    error: organizationError,
    isLoading: organizationLoading,
    mutate: mutateOrganization,
  } = useOfflineSWR<Organization | OrganizationExpanded>(
    `organizations/${orgId}`,
    {
      fallbackData: _organization,
      onError: (err) => {
        console.error("Error fetching organization:", err, {
          context: { orgId, isOnline },
        });
      },
    },
  );

  const { data: user, isLoading: userLoading } = useOfflineSWR<User>("user");
  const [showMockData, setShowMockData] = useState(false);
  const [showTapToPayBanner, setShowTapToPayBanner] = useState(false);
  const { supportsTapToPay } = useStripeTerminalInit({
    organizationId: organization?.id,
    enabled: !!(organization && !organization.playground_mode),
  });
  const userinOrganization = useMemo(() => {
    return (
      organization &&
      "users" in organization &&
      organization.users.some((u) => u.id === user?.id)
    );
  }, [organization, user]);
  const playgroundMode = useMemo(
    () => organization?.playground_mode,
    [organization],
  );
  const donationPageAvailable = useMemo(
    () => organization?.donation_page_available,
    [organization],
  );
  const organizationErrorStatus = useMemo(() => {
    return organizationError &&
      typeof organizationError === "object" &&
      "status" in organizationError
      ? organizationError.status
      : null;
  }, [organizationError]);
  const isAccessDenied = useMemo(
    () => organizationErrorStatus === 403,
    [organizationErrorStatus],
  );

  const {
    transactions: _transactions,
    isLoadingMore,
    loadMore,
    isLoading,
  } = useTransactions(orgId, "organizations");
  const [refreshing] = useState(false);


  useEffect(() => {
    const isOfflineNoData = organizationError && !isOnline && !organization;

    if (isAccessDenied) {
      navigation.setOptions({
        title: "Access Denied",
      });
    } else if (isOfflineNoData) {
      navigation.setOptions({
        title: "Offline",
      });
    } else if (organization) {
      navigation.setOptions({
        title: organization.name || "Organization",
      });
    }
  }, [organizationError, organization, navigation, isOnline, isAccessDenied]);

  useEffect(() => {
    const checkTapToPayBanner = async () => {
      try {
        const hasSeenBanner = await AsyncStorage.getItem(
          "hasSeenTapToPayBanner",
        );

        if (
          !hasSeenBanner &&
          userinOrganization &&
          !playgroundMode &&
          supportsTapToPay &&
          donationPageAvailable &&
          Platform.OS === "ios"
        ) {
          setShowTapToPayBanner(true);
        } else {
          setShowTapToPayBanner(false);
        }
      } catch (error) {
        console.error("Error checking tap to pay banner status", error, {
          context: { action: "check_ttp_banner" },
        });
        setShowTapToPayBanner(false);
      }
    };
    checkTapToPayBanner();
  }, [
    supportsTapToPay,
    userinOrganization,
    organization,
    playgroundMode,
    donationPageAvailable,
    user,
  ]);

  const handleDismissTapToPayBanner = async () => {
    try {
      await AsyncStorage.setItem("hasSeenTapToPayBanner", "true");
      setShowTapToPayBanner(false);
    } catch (error) {
      console.error("Error saving tap to pay banner dismiss status", error, {
        context: { action: "dismiss_ttp_banner" },
      });
      setShowTapToPayBanner(false);
    }
  };

  useEffect(() => {
    if (organization && user) {
      navigation.setOptions({
        title: organization.name,
        headerRight: () => (
          <Menu
            user={user}
            navigation={navigation}
            organization={organization}
            supportsTapToPay={supportsTapToPay}
          />
        ),
      });
    }
  }, [organization, navigation, user, supportsTapToPay]);

  useEffect(() => {
    if (organizationErrorStatus === 401) {
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

  const onRefresh = useCallback(() => {
    if (isOnline) {
      mutate(`organizations/${orgId}`);
      mutate(`organizations/${orgId}/transactions`);
    }
  }, [isOnline, orgId]);

  if (organizationLoading || userLoading || isAccessDenied) {
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
    return <AccessDenied orgId={orgId} onGoBack={() => navigation.goBack()} />;
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
        <SectionList
          initialNumToRender={20}
          ListFooterComponent={() =>
            isLoadingMore && !isLoading && !playgroundMode ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            ) : null
          }
          onEndReachedThreshold={0.2}
          onEndReached={loadMore}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={() => (
            <>
              {showTapToPayBanner && (
                <TapToPayBanner
                  onDismiss={handleDismissTapToPayBanner}
                  orgId={orgId}
                />
              )}
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
            </>
          )}
          // @ts-expect-error workaround for mock data
          sections={
            playgroundMode && showMockData
              ? (mockSections as unknown)
              : sections
          }
          style={{ flexGrow: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: tabBarSize + 20,
          }}
          scrollIndicatorInsets={{ bottom: tabBarSize }}
          renderSectionHeader={({ section: { title } }) => (
            <SectionHeader title={title} />
          )}
          renderItem={({ item, index, section: { data } }) => {
            if (playgroundMode) {
              return (
                <MockTransaction
                  transaction={item}
                  top={index === 0}
                  bottom={index === data.length - 1}
                />
              );
            }

            return (
              <TransactionWrapper
                item={item}
                user={user}
                organization={organization}
                navigation={navigation}
                orgId={orgId}
                index={index}
                data={data as ITransaction[]}
              />
            );
          }}
        />
      ) : (
        <LoadingSkeleton />
      )}
    </View>
  );
}
