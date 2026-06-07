import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "expo-router/react-navigation";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  View,
} from "react-native";

import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import ActionChip from "@/components/organizations/ActionChip";
import ActionTile from "@/components/organizations/ActionTile";
import { EmptyState } from "@/components/organizations/EmptyState";
import Header from "@/components/organizations/Header";
import PlaygroundBanner from "@/components/organizations/PlaygroundBanner";
import RecentTransactionsSkeleton from "@/components/organizations/RecentTransactionsSkeleton";
import SectionCard from "@/components/organizations/SectionCard";
import TapToPayBanner from "@/components/organizations/TapToPayBanner";
import TeamAvatars from "@/components/organizations/TeamAvatars";
import TransactionWrapper from "@/components/organizations/TransactionWrapper";
import { showAlert } from "@/lib/alertUtils";
import { OrgPolicy } from "@/lib/policies";
import { PaginatedResponse } from "@/lib/types/HcbApiObject";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import ITransaction from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { shareUrl } from "@/utils/shareUrl";
import { addPendingFeeToTransactions } from "@/utils/org";

export default function Page() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; fallbackData?: string }>();
  const { isOnline } = useOffline();

  const {
    data: organization,
    error: organizationError,
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

  const { data: user } = useOfflineSWR<User>("user");
  const [showMockData, setShowMockData] = useState(false);
  const [showTapToPayBanner, setShowTapToPayBanner] = useState(false);
  const { supportsTapToPay } = useStripeTerminalInit({
    organizationId: organization?.id,
    enabled: !!(organization && !organization.playground_mode),
  });
  const orgPolicy = useMemo(() => {
    if (!organization || !("users" in organization)) return null;
    return new OrgPolicy(user ?? null, organization as OrganizationExpanded);
  }, [organization, user]);
  const playgroundMode = organization?.playground_mode;
  const isAccessDenied = useMemo(
    () => organizationError?.toString().includes("403"),
    [organizationError],
  );

  const { data: transactionsPage, isLoading } = useOfflineSWR<
    PaginatedResponse<ITransaction>
  >(`organizations/${params.id}/transactions?limit=35`);

  useEffect(() => {
    const isOfflineNoData = organizationError && !isOnline && !organization;

    if (isAccessDenied) {
      navigation.setOptions({ title: "Access Denied" });
    } else if (isOfflineNoData) {
      navigation.setOptions({ title: "Offline" });
    } else if (organization) {
      navigation.setOptions({
        title: organization.name || "Organization",
        headerRight: () => (
          <ShareHeaderButton url={shareUrl.org(organization.slug)} />
        ),
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
          orgPolicy?.donationPage() &&
          orgPolicy?.show() &&
          supportsTapToPay &&
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
  }, [supportsTapToPay, orgPolicy, organization, user]);

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
    if (organizationError?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationError, mutateOrganization]);

  const { colors: themeColors } = useTheme();

  const recentTransactions = useMemo(
    () =>
      addPendingFeeToTransactions(
        transactionsPage?.data ?? [],
        organization,
      ).slice(0, 6),
    [transactionsPage, organization],
  );

  const teamUsers = useMemo(() => {
    if (organization && "users" in organization) {
      return organization.users;
    }
    return [];
  }, [organization]);

  const navTo = (path: string, extraParams?: Record<string, string>) => {
    router.push({
      pathname: path,
      params: { id: params.id, ...extraParams },
    });
  };

  if (!organization) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
        {showTapToPayBanner && (
          <TapToPayBanner
            onDismiss={handleDismissTapToPayBanner}
            orgId={params.id as `org_${string}`}
          />
        )}
        {playgroundMode && <PlaygroundBanner />}
        <Header
          organization={organization}
          showMockData={showMockData}
          setShowMockData={setShowMockData}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 16 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 8,
        }}
      >
        <ActionChip
          icon="briefcase"
          label="Check Deposits"
          onPress={() => navTo("/(events)/[id]/check-deposits")}
        />
        <ActionChip
          icon="bank-circle"
          label="Account Numbers"
          onPress={() => navTo("/(events)/[id]/account-numbers")}
        />
        {supportsTapToPay && orgPolicy?.donationPage() && orgPolicy?.show() && (
          <ActionChip
            icon="support"
            label="Collect Donations"
            onPress={() => navTo("/(events)/[id]/donations")}
          />
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          gap: 16,
          paddingTop: 4,
          paddingBottom: 40,
        }}
      >
        {isLoading ? (
          <RecentTransactionsSkeleton />
        ) : recentTransactions.length > 0 ? (
          <SectionCard
            title="Recent transactions"
            onSeeAll={() =>
              router.push({
                pathname: "/(events)/[id]/transactions",
                params: { id: params.id, fallbackData: params.fallbackData },
              })
            }
          >
            <View>
              {recentTransactions.map((transaction, index) => (
                <TransactionWrapper
                  key={(transaction as ITransaction).id || index}
                  item={transaction as ITransaction}
                  user={user}
                  organization={organization}
                  orgId={params.id as `org_${string}`}
                  isFirst={index === 0}
                  isLast={index === recentTransactions.length - 1}
                />
              ))}
            </View>
          </SectionCard>
        ) : (
          !showMockData && <EmptyState isOnline={isOnline} />
        )}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionTile
              icon="payment-transfer"
              label="Transfer"
              onPress={() =>
                navTo("/(events)/[id]/transfer", {
                  organization: JSON.stringify(organization),
                })
              }
            />
            <ActionTile
              icon="card"
              label="Cards"
              onPress={() => navTo("/(events)/[id]/cards")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionTile
              icon="support"
              label="Donations"
              onPress={() => {
                if (!supportsTapToPay) {
                  showAlert(
                    "Unsupported Device",
                    "Collecting donations is only supported on iOS 16.4 and later.",
                  );
                  return;
                }
                navTo("/(events)/[id]/donations");
              }}
            />
            <ActionTile
              icon="attachment"
              label="Reimburse"
              onPress={() => navTo("/(events)/[id]/reimbursements")}
            />
          </View>
        </View>

        {teamUsers.length > 0 && (
          <SectionCard
            title="Team members"
            onSeeAll={() =>
              router.push({
                pathname: "/(events)/[id]/team",
                params: { id: params.id },
              })
            }
          >
            <TeamAvatars users={teamUsers} />
          </SectionCard>
        )}
      </View>
    </ScrollView>
  );
}
