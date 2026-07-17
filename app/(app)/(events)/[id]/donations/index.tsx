import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Badge from "@/components/Badge";
import { LoadingSkeleton } from "@/components/organizations/LoadingSkeleton";
import { Text } from "@/components/Text";
import useDonations, { DonationFilters } from "@/lib/organization/useDonations";
import {
  Donation,
  DonationStatus,
  donationVisibleStatus,
} from "@/lib/types/Donation";
import Organization from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { cardBorderColor, palette, radii } from "@/styles/theme";
import { renderDate, renderMoney, statusColor } from "@/utils/format";
import { shareUrl } from "@/utils/shareUrl";

const STATUS_FILTERS: { label: string; value?: DonationStatus }[] = [
  { label: "All", value: undefined },
  { label: "Deposited", value: "deposited" },
  { label: "Refunded", value: "refunded" },
];

const STATUS_LABELS: Record<DonationStatus, string> = {
  deposited: "Deposited",
  in_transit: "In transit",
  refunded: "Refunded",
  failed: "Failed",
};

type ListItem = { donation: Donation; isFirst: boolean; isLast: boolean };

function StatCard({
  totalCents,
  loading,
}: {
  totalCents?: number;
  loading: boolean;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 4,
        backgroundColor: themeColors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
        paddingVertical: 20,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: "600" }}>
        Total
      </Text>
      <Text
        style={{ color: themeColors.text, fontSize: 28, fontWeight: "700" }}
      >
        {loading && totalCents === undefined
          ? "—"
          : renderMoney(totalCents ?? 0)}
      </Text>
    </View>
  );
}

function DonationRow({
  donation,
  isFirst,
  isLast,
  orgId,
}: ListItem & { orgId: string }) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const status = donationVisibleStatus(donation);
  const name = donation.donor?.name?.trim() || "Anonymous";

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(events)/[id]/donations/[donationId]",
            params: {
              id: orgId,
              donationId: donation.id,
              donation: JSON.stringify(donation),
            },
          })
        }
        style={({ pressed }) => ({
          backgroundColor: themeColors.card,
          borderColor: cardBorderColor(isDark),
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopWidth: isFirst ? 1 : 0,
          borderBottomWidth: isLast ? 1 : 0,
          borderTopLeftRadius: isFirst ? radii.lg : 0,
          borderTopRightRadius: isFirst ? radii.lg : 0,
          borderBottomLeftRadius: isLast ? radii.lg : 0,
          borderBottomRightRadius: isLast ? radii.lg : 0,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {!isFirst && (
          <View
            style={{
              height: 1,
              backgroundColor: cardBorderColor(isDark),
              marginHorizontal: 16,
            }}
          />
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: themeColors.text,
                  fontSize: 15,
                  fontWeight: "600",
                  flexShrink: 1,
                }}
              >
                {name}
              </Text>
              {donation.recurring && (
                <Ionicons name="repeat" size={14} color={palette.success} />
              )}
            </View>
            <Text style={{ color: palette.muted, fontSize: 13 }}>
              {renderDate(donation.donated_at)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Text
              style={{
                color: themeColors.text,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {renderMoney(donation.amount_cents)}
            </Text>
            <Badge color={statusColor(status)}>{STATUS_LABELS[status]}</Badge>
          </View>
          <Ionicons name="chevron-forward" size={16} color={palette.muted} />
        </View>
      </Pressable>
    </View>
  );
}

export default function DonationsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const { isOnline } = useOffline();
  const { bottom: tabBarSize } = useSafeAreaInsets();
  const headerInset = useHeaderInset();

  const [filters, setFilters] = useState<DonationFilters>({});

  const { data: organization } = useOfflineSWR<Organization>(
    `organizations/${id}`,
  );

  const { supportsTapToPay } = useStripeTerminalInit({
    organizationId: organization?.id,
    enabled: !!(organization && !organization.playground_mode),
  });

  const {
    donations,
    stats,
    totalCount,
    isLoading,
    isLoadingMore,
    loadMore,
    mutate,
  } = useDonations(id, filters);

  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const donationPageUrl = organization?.slug
    ? shareUrl.donations(organization.slug)
    : undefined;
  const canCollect =
    supportsTapToPay && (organization?.donation_page_available ?? false);

  useEffect(() => {
    navigation.setOptions({
      title: "Donations",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {donationPageUrl && (
            <Pressable
              onPress={async () => {
                try {
                  if (Platform.OS === "ios") {
                    await Share.share({ url: donationPageUrl });
                  } else {
                    await Share.share({ message: donationPageUrl });
                  }
                } catch (error) {
                  console.error("Error sharing donation page:", error);
                }
              }}
              style={({ pressed }) => ({
                padding: 8,
                opacity: pressed ? 0.6 : 1,
              })}
              accessibilityLabel="Share donation page"
              accessibilityRole="button"
            >
              <Ionicons
                name="share-outline"
                size={24}
                color={themeColors.text}
              />
            </Pressable>
          )}
          {canCollect && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(events)/[id]/donations/new",
                  params: { id, orgSlug: organization?.slug },
                })
              }
              style={({ pressed }) => ({
                padding: 8,
                opacity: pressed ? 0.6 : 1,
              })}
              accessibilityLabel="Collect a donation"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={26} color={themeColors.text} />
            </Pressable>
          )}
        </View>
      ),
    });
  }, [
    navigation,
    themeColors.text,
    donationPageUrl,
    canCollect,
    id,
    organization?.slug,
  ]);

  const onRefresh = useCallback(
    async (showIndicator = true) => {
      if (!isOnline || isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      if (showIndicator) setRefreshing(true);
      try {
        await mutate();
      } catch (err) {
        const e = err as Error | undefined;
        if (e?.name !== "AbortError" && e?.name !== "NetworkError") {
          console.error("Error refreshing donations:", err);
        }
      } finally {
        isRefreshingRef.current = false;
        if (showIndicator) setRefreshing(false);
      }
    },
    [isOnline, mutate],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !isRefreshingRef.current) {
        onRefresh(false);
      }
    }, [onRefresh, isLoading]),
  );

  const listData: ListItem[] = useMemo(
    () =>
      donations.map((donation, index) => ({
        donation,
        isFirst: index === 0,
        isLast: index === donations.length - 1,
      })),
    [donations],
  );

  const renderHeader = useCallback(
    () => (
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 20,
          gap: 16,
        }}
      >
        <View style={{ gap: 12 }}>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            {totalCount} {totalCount === 1 ? "donation" : "donations"}
          </Text>
          <StatCard totalCents={stats?.total_cents} loading={isLoading} />
        </View>

        {/* Status filter */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATUS_FILTERS.map((f) => {
            const active = filters.status === f.value;
            return (
              <Pressable
                key={f.label}
                onPress={() => setFilters({ status: f.value })}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 9999,
                  backgroundColor: active ? palette.primary : themeColors.card,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? "#fff" : themeColors.text,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [
      totalCount,
      stats?.total_cents,
      isLoading,
      filters.status,
      themeColors.card,
      themeColors.text,
    ],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={{ paddingHorizontal: 20 }}>
          <LoadingSkeleton />
        </View>
      );
    }
    return (
      <View style={{ alignItems: "center", paddingTop: 48, gap: 10 }}>
        <Ionicons name="heart-outline" size={40} color={palette.muted} />
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          {filters.status
            ? "No donations match this filter."
            : "No donations yet."}
        </Text>
      </View>
    );
  }, [isLoading, filters.status]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore || isLoading) return null;
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color={themeColors.primary} />
      </View>
    );
  }, [isLoadingMore, isLoading, themeColors.primary]);

  return (
    <FlashList
      data={listData}
      renderItem={({ item }) => <DonationRow {...item} orgId={id} />}
      keyExtractor={(item) => item.donation.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshing={refreshing}
      onRefresh={() => onRefresh(true)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: headerInset,
        paddingBottom: tabBarSize + 24,
      }}
      showsVerticalScrollIndicator
    />
  );
}
