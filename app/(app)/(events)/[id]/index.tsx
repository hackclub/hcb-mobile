import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { Text } from "components/Text";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { EmptyState } from "@/components/organizations/EmptyState";
import Header from "@/components/organizations/Header";
import PlaygroundBanner from "@/components/organizations/PlaygroundBanner";
import TapToPayBanner from "@/components/organizations/TapToPayBanner";
import TransactionWrapper from "@/components/organizations/TransactionWrapper";
import UserAvatar from "@/components/UserAvatar";
import { showAlert } from "@/lib/alertUtils";
import useTransactions from "@/lib/organization/useTransactions";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import ITransaction from "@/lib/types/Transaction";
import User, { OrgUser } from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { palette } from "@/styles/theme";
import { addPendingFeeToTransactions } from "@/utils/util";

// --- 2x2 Grid Action Tile ---
function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: themeColors.card,
        borderRadius: 14,
        paddingVertical: 18,
        paddingHorizontal: 14,
        gap: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.07)"
            : "rgba(0,0,0,0.05)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon glyph={icon} size={20} color={themeColors.text} />
      </View>
      <Text
        style={{
          color: themeColors.text,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// --- Small horizontal chip ---
function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: themeColors.card,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon glyph={icon} size={16} color={palette.muted} />
      <Text
        style={{ color: themeColors.text, fontSize: 14, fontWeight: "500" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// --- Section Card wrapper ---
function SectionCard({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: themeColors.text }}
        >
          {title}
        </Text>
        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ color: palette.muted, fontSize: 14 }}>See all</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// --- Team Avatars Row ---
function TeamAvatars({ users }: { users: OrgUser[] }) {
  const { colors: themeColors } = useTheme();
  const MAX_SHOWN = 8;
  const shown = users.slice(0, MAX_SHOWN);
  const overflow = users.length - MAX_SHOWN;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
      }}
    >
      {shown.map((u, i) => (
        <View
          key={u.id}
          style={{
            marginLeft: i === 0 ? 0 : -6,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: themeColors.card,
          }}
        >
          <UserAvatar user={u} size={36} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: -6,
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.slate,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: themeColors.card,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

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
  const isAccessDenied = useMemo(
    () => organizationError?.toString().includes("403"),
    [organizationError],
  );

  const { transactions: _transactions, isLoading } = useTransactions(
    params.id,
    "organizations",
  );

  useEffect(() => {
    const isOfflineNoData = organizationError && !isOnline && !organization;

    if (isAccessDenied) {
      navigation.setOptions({ title: "Access Denied" });
    } else if (isOfflineNoData) {
      navigation.setOptions({ title: "Offline" });
    } else if (organization) {
      navigation.setOptions({ title: organization.name || "Organization" });
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
    if (organizationError?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationError, mutateOrganization]);

  const { colors: themeColors } = useTheme();

  const transactions = useMemo(
    () => addPendingFeeToTransactions(_transactions, organization),
    [_transactions, organization],
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 6),
    [transactions],
  );

  const teamUsers = useMemo(() => {
    if (organization && "users" in organization) {
      return organization.users;
    }
    return [];
  }, [organization]);

  // Navigation helper
  const navTo = (path: string | null, extraParams?: Record<string, string>) => {
    if (!path) {
      showAlert("Coming Soon", "This feature is coming soon.");
      return;
    }
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
      {/* Banners + Header */}
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

      {/* Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 8,
          paddingVertical: 16,
        }}
      >
        <ActionChip
          icon="briefcase"
          label="Deposit a check"
          onPress={() => navTo(null)}
        />
        <ActionChip
          icon="bank-circle"
          label="Account Numbers"
          onPress={() => navTo("/(events)/[id]/account-numbers")}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
        {/* Recent Transactions */}
        {isLoading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
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

        {/* 2x2 Action Grid */}
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
              onPress={() => navTo("/(events)/[id]/cards/order")}
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
              onPress={() => navTo(null)}
            />
          </View>
        </View>

        {/* Team Members */}
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
