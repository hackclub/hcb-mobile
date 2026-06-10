import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { useShareIntentContext } from "expo-share-intent";
import * as WebBrowser from "expo-web-browser";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";
import { preload, useSWRConfig } from "swr";

import Event from "@/components/organizations/Event";
import GrantInvite from "@/components/organizations/GrantInvite";
import { HomeLoadingSkeleton } from "@/components/organizations/HomeLoadingSkeleton";
import InvitationCard from "@/components/organizations/InvitationCard";
import { NoOrganizationsEmptyState } from "@/components/organizations/NoOrganizationsEmptyState";
import { Text } from "@/components/Text";
import useReorderedOrgs from "@/lib/organization/useReorderedOrgs";
import GrantCard from "@/lib/types/GrantCard";
import Invitation from "@/lib/types/Invitation";
import Organization from "@/lib/types/Organization";
import ITransaction from "@/lib/types/Transaction";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette } from "@/styles/theme";
import * as Haptics from "@/utils/haptics";
import { organizationOrderEqual } from "@/utils/org";

const EventItem = memo(
  ({
    organization,
    orgCount,
  }: {
    organization: Organization;
    orgCount: number;
  }) => {
    const drag = useReorderableDrag();
    const handlePress = useCallback(() => {
      router.push({
        pathname: "[id]",
        params: {
          id: organization.id,
          fallbackData: JSON.stringify(organization),
        },
      });
    }, [organization]);

    return (
      <Event
        event={organization}
        drag={drag}
        isActive={false}
        showTransactions={orgCount <= 2}
        onPress={handlePress}
      />
    );
  },
  (prev, next) =>
    prev.organization.id === next.organization.id &&
    prev.organization.name === next.organization.name &&
    prev.organization.icon === next.organization.icon &&
    prev.organization.background_image === next.organization.background_image &&
    prev.orgCount === next.orgCount,
);

EventItem.displayName = "EventItem";

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const {
    data: missingReceiptData,
    error: missingReceiptError,
    mutate: refetchMissingReceipts,
  } = useOfflineSWR<{
    data: (ITransaction & { organization: Organization })[];
  }>(hasShareIntent ? "user/transactions/missing_receipt" : null);

  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [shareIntentProcessed, setShareIntentProcessed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleDragStart = useCallback(() => {
    "worklet";

    // NOTE: If it's refreshing we don't want the refresh control to disappear
    // and we can keep it enabled since it won't conflict with the drag.
    if (Platform.OS === "android" && !refreshing) {
      runOnJS(setRefreshEnabled)(false);
    }
  }, [refreshing]);

  const handleDragEnd = useCallback(() => {
    "worklet";

    if (Platform.OS === "android") {
      runOnJS(setRefreshEnabled)(true);
    }
  }, []);

  useEffect(() => {
    if (hasShareIntent && shareIntent && !shareIntentProcessed) {
      const imageUrls =
        (shareIntent as { files?: Array<{ path: string }> }).files?.map(
          (file) => file.path,
        ) || [];

      if (imageUrls.length > 0) {
        // If we have missing receipt data, show the modal with transactions
        if (missingReceiptData?.data && missingReceiptData.data.length > 0) {
          router.navigate({
            pathname: "/share-intent",
            params: {
              images: JSON.stringify(imageUrls),
              missingTransactions: JSON.stringify(missingReceiptData.data),
            },
          });
          setShareIntentProcessed(true);
          resetShareIntent();
        } else if (!missingReceiptError && !missingReceiptData) {
          // Wait for data to load before navigating
        } else {
          if (missingReceiptError) {
            console.error(
              "Error fetching missing receipts, retrying",
              missingReceiptError,
              { context: { action: "missing_receipts_fetch" } },
            );
            refetchMissingReceipts();
          } else {
            router.navigate({
              pathname: "/share-intent",
              params: {
                images: JSON.stringify(imageUrls),
                missingTransactions: JSON.stringify([]),
              },
            });
            setShareIntentProcessed(true);
            resetShareIntent();
          }
        }
      }
    }
  }, [
    hasShareIntent,
    shareIntent,
    missingReceiptData,
    missingReceiptError,
    resetShareIntent,
    shareIntentProcessed,
    refetchMissingReceipts,
  ]);

  useEffect(() => {
    if (hasShareIntent) {
      setShareIntentProcessed(false);
    }
  }, [hasShareIntent]);

  useEffect(() => {
    return () => {
      if (hasShareIntent) {
        resetShareIntent();
      }
    };
  }, [hasShareIntent, resetShareIntent]);

  const {
    data: organizations,
    error,
    mutate: reloadOrganizations,
    isLoading: organizationsLoading,
  } = useOfflineSWR<Organization[]>("user/organizations", {
    fallbackData: [],
  });

  const [sortedOrgs, setSortedOrgs] = useReorderedOrgs(organizations);

  const { data: invitations, mutate: reloadInvitations } = useOfflineSWR<
    Invitation[]
  >("user/invitations", {
    fallbackData: [],
  });

  const { data: grantCards, mutate: reloadGrantCards } = useOfflineSWR<
    GrantCard[]
  >("user/card_grants", {
    fallbackData: [],
  });

  const grantInvites = useMemo(() => {
    return (
      grantCards?.filter(
        (grant) => grant.status === "active" && !grant.card_id,
      ) || []
    );
  }, [grantCards]);

  const { fetcher, mutate } = useSWRConfig();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const panGesture = useMemo(
    () => Gesture.Pan().activateAfterLongPress(520),
    [],
  );

  const openApply = useCallback(() => {
    WebBrowser.openBrowserAsync("https://hackclub.com/hcb/apply", {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,
      controlsColor: palette.primary,
      dismissButtonStyle: "cancel",
    }).then(() => {
      mutate("user/organizations");
      mutate("user/invitations");
    });
  }, [mutate]);

  useEffect(() => {
    if (!organizations?.length) return;

    preload("user", fetcher!);
    preload("user/cards", fetcher!);

    organizations.forEach((org) => {
      preload(`organizations/${org.id}`, fetcher!);
      preload(`organizations/${org.id}/transactions?limit=35`, fetcher!);
      preload(`organizations/${org.id}/balance_by_date`, fetcher!);
    });
  }, [organizations, fetcher]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await Promise.all([
        reloadOrganizations(),
        reloadInvitations(),
        reloadGrantCards(),
      ]);
      await mutate(
        (k) => typeof k === "string" && k.startsWith("organizations"),
      );
    } finally {
      setRefreshing(false);
    }
  }, [reloadOrganizations, reloadInvitations, reloadGrantCards, mutate]);

  useFocusEffect(
    useCallback(() => {
      mutate((k) => typeof k === "string" && k.startsWith("organizations"));
    }, [mutate]),
  );

  const orgCount = organizations?.length ?? 0;

  const renderItem = useCallback(
    ({ item: organization }: { item: Organization }) => (
      <EventItem organization={organization} orgCount={orgCount} />
    ),
    [orgCount],
  );

  if (error && !organizations?.length) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons
          name="cloud-offline-outline"
          color={palette.muted}
          size={60}
        />
        <Text style={{ color: palette.muted }}>Offline mode</Text>
        <Text style={{ color: palette.muted, marginTop: 10 }}>
          Using cached data
        </Text>
      </View>
    );
  }

  if (organizationsLoading) {
    return <HomeLoadingSkeleton />;
  }

  return (
    <ReorderableList
      keyExtractor={(item) => item.id}
      onReorder={({ from, to }) => {
        Haptics.selectionAsync();
        const newOrgs = [...sortedOrgs];
        const [removed] = newOrgs.splice(from, 1);
        newOrgs.splice(to, 0, removed);
        if (!organizationOrderEqual(newOrgs, sortedOrgs)) {
          setSortedOrgs(newOrgs);
        }
      }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: 20,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={sortedOrgs}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          enabled={refreshEnabled}
        />
      }
      panGesture={panGesture}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      ListEmptyComponent={() => <NoOrganizationsEmptyState />}
      ListHeaderComponent={() => (
        <>
          {(invitations && invitations.length > 0) ||
          (grantInvites && grantInvites.length > 0) ? (
            <View
              style={{
                marginTop: 10,
                marginBottom: 20,
                borderRadius: 10,
              }}
            >
              {invitations && invitations.length > 0 && (
                <>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 12,
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Pending invitations
                  </Text>
                  <View style={{ gap: 10 }}>
                    {invitations.map((invitation) => (
                      <InvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        onPress={() =>
                          router.push({
                            pathname: "/invitation/[id]",
                            params: {
                              id: invitation.id,
                              invitation: JSON.stringify(invitation),
                            },
                          })
                        }
                      />
                    ))}
                  </View>
                </>
              )}

              {grantInvites && grantInvites.length > 0 && (
                <>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 12,
                      textTransform: "uppercase",
                      marginBottom: 10,
                      marginTop: invitations && invitations.length > 0 ? 20 : 0,
                    }}
                  >
                    Available grants
                  </Text>
                  <View style={{ gap: 10 }}>
                    {grantInvites.map((grant) => (
                      <GrantInvite key={grant.id} grant={grant} />
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : null}
        </>
      )}
      renderItem={renderItem}
      ListFooterComponent={() =>
        organizations && organizations.length > 0 ? (
          <>
            <Pressable
              accessibilityLabel="Apply for new organization"
              accessibilityHint="Opens the HCB application form in browser"
              accessibilityRole="button"
              onPress={openApply}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 8,
                justifyContent: "center",
                backgroundColor: themeColors.card,
                borderWidth: 1,
                borderColor: cardBorderColor(isDark),
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="add" size={20} color={palette.muted} />
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
                Start a new organization
              </Text>
            </Pressable>

            {organizations.length > 2 && (
              <Text
                style={{
                  color: palette.muted,
                  textAlign: "center",
                  marginTop: 10,
                  marginBottom: 10,
                }}
              >
                Drag to reorder organizations
              </Text>
            )}
          </>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
    />
  );
}
