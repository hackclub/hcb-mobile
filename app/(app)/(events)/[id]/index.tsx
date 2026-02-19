/* eslint-disable react/prop-types */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import groupBy from "lodash/groupBy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSWRConfig } from "swr";

import { EmptyState } from "@/components/organizations/EmptyState";
import Header from "@/components/organizations/Header";
import { LoadingSkeleton } from "@/components/organizations/LoadingSkeleton";
import PlaygroundBanner from "@/components/organizations/PlaygroundBanner";
import TapToPayBanner from "@/components/organizations/TapToPayBanner";
import useTransactions from "@/lib/organization/useTransactions";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import { TransactionWithoutId } from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { addPendingFeeToTransactions, renderDate } from "@/utils/util";

const ListItemButton = ({
  children,
  badge,
  onPress,
}: {
  children?: React.ReactNode;
  badge?: number;
  onPress?: () => void;
}) => {
  return (
    <Pressable
      style={{
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: "center",
        gap: 8,
      }}
      onPress={onPress}
    >
      {children}
      {badge && (
        <Text style={{ marginLeft: "auto", opacity: 0.4 }}>{badge}</Text>
      )}
    </Pressable>
  );
};

const ListItemText = ({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string;
}) => {
  return (
    <View style={{ flex: 1 }}>
      <Text>{primary}</Text>
      {secondary && <Text style={{ opacity: 0.6 }}>{secondary}</Text>}
    </View>
  );
};

export default function Page() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { isOnline } = useOffline();

  const {
    data: organization,
    error: organizationError,
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
    return organizationError?.toString().includes("403");
  }, [organizationError]);
  const isAccessDenied = useMemo(
    () => organizationError?.toString().includes("403"),
    [organizationError],
  );

  const {
    transactions: _transactions,
    isLoading,
    mutate: mutateTransactions,
  } = useTransactions(params.id, "organizations");
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

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
    navigation.setOptions({ title: organization?.name || "Organization" });
  }, [organization, navigation]);

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
    if (organizationErrorStatus?.toString().includes("401")) {
      mutateOrganization();
    }
  }, [organizationErrorStatus, mutateOrganization]);

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

  const renderListHeader = useCallback(() => {
    if (!organization) return null;

    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {showTapToPayBanner && (
          <TapToPayBanner
            onDismiss={handleDismissTapToPayBanner}
            orgId={params.id}
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
      </View>
    );
  }, [
    showTapToPayBanner,
    params,
    playgroundMode,
    organization,
    showMockData,
    isLoading,
    sections.length,
    isOnline,
  ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {renderListHeader()}
      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 16,
          }}
        >
          {[
            {
              name: "Transactions",
              badge: 100,
              path: "/(events)/[id]/transactions",
            },
            {
              name: "Team members",
              badge: 100,
              path: "/(events)/[id]/transactions",
            },
            {
              name: "Collect donations",
              path: "/(events)/[id]/transactions",
            },
            {
              name: "Account details",
              path: "/(events)/[id]/transactions",
            },
            {
              name: "Transfer money",
              path: "/(events)/[id]/transactions",
            },
          ].map((button, i) => (
            <ListItemButton
              key={i}
              onPress={() => {
                router.push({
                  pathname: button.path,
                  params: {
                    id: params.id,
                    fallbackData: params.fallbackData,
                  },
                });
              }}
            >
              <ListItemText primary={button.name} />
              <Text style={{ opacity: 0.6 }}>{button.badge}</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={themeColors.text}
              />
            </ListItemButton>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
