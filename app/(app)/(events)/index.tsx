import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import PageTitle from "components/PageTitle";
import { Text } from "components/Text";
import { router } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import * as WebBrowser from "expo-web-browser";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { preload, useSWRConfig } from "swr";

import Event from "@/components/organizations/Event";
import GrantInvite from "@/components/organizations/GrantInvite";
import { HomeLoadingSkeleton } from "@/components/organizations/HomeLoadingSkeleton";
import { NoOrganizationsEmptyState } from "@/components/organizations/NoOrganizationsEmptyState";
import PromoBanner from "@/components/PromoBanner";
import { StackParamList } from "@/lib/NavigatorParamList";
import useReorderedOrgs from "@/lib/organization/useReorderedOrgs";
import GrantCard from "@/lib/types/GrantCard";
import Invitation from "@/lib/types/Invitation";
import Organization from "@/lib/types/Organization";
import ITransaction from "@/lib/types/Transaction";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import * as Haptics from "@/utils/haptics";
import { organizationOrderEqual } from "@/utils/util";

type Props = NativeStackScreenProps<StackParamList, "Organizations">;

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fallbackData: organization as any,
        },
      });
      // navigation.navigate("Event", {
      //   orgId: organization.id,
      //   organization,
      // });
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

/* eslint-disable react/prop-types */
export default function App({ navigation }: Props) {
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
          navigation.navigate("ShareIntentModal", {
            images: imageUrls,
            missingTransactions: missingReceiptData.data,
          });
          setShareIntentProcessed(true);
          resetShareIntent();
        } else if (!missingReceiptError && !missingReceiptData) {
          // Don't process yet, wait for data to load
        } else {
          if (missingReceiptError) {
            console.error(
              "Error fetching missing receipts, retrying",
              missingReceiptError,
              { context: { action: "missing_receipts_fetch" } },
            );
            // Retry fetching missing receipts
            refetchMissingReceipts();
          } else {
            // No missing receipts, but still show modal for receipt bin upload
            navigation.navigate("ShareIntentModal", {
              images: imageUrls,
              missingTransactions: [],
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
    navigation,
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

  // Filter grants that are active but don't have a card_id yet (need to create card)
  const grantInvites = useMemo(() => {
    return (
      grantCards?.filter(
        (grant) => grant.status === "active" && !grant.card_id,
      ) || []
    );
  }, [grantCards]);

  const { fetcher, mutate } = useSWRConfig();
  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();
  const scheme = useColorScheme();
  const usePanGesture = () =>
    useMemo(() => Gesture.Pan().activateAfterLongPress(520), []);
  const panGesture = usePanGesture();

  useEffect(() => {
    if (!organizations?.length) return;

    preload("user", fetcher!);
    preload("user/cards", fetcher!);

    organizations.forEach((org) => {
      const orgKey = `organizations/${org.id}`;
      const transactionsKey = `organizations/${org.id}/transactions?limit=35`;

      preload(orgKey, fetcher!);
      preload(transactionsKey, fetcher!);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    [navigation, orgCount],
  );

  // Show cached data even if there's an error
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
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
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
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: tabBarHeight,
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
            <PageTitle title="Organizations" />
            <PromoBanner />
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
                    {invitations.map((invitation) => (
                      <Event
                        key={invitation.id}
                        invitation={invitation}
                        style={{
                          borderWidth: 2,
                          borderColor:
                            scheme == "dark" ? palette.primary : palette.muted,
                          marginBottom: 10,
                        }}
                        event={invitation.organization}
                        onPress={() =>
                          navigation.navigate("Invitation", {
                            inviteId: invitation.id,
                            invitation,
                          })
                        }
                        hideBalance
                      />
                    ))}
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
                        marginTop:
                          invitations && invitations.length > 0 ? 20 : 0,
                      }}
                    >
                      Available grants
                    </Text>
                    {grantInvites.map((grant) => (
                      <GrantInvite
                        key={grant.id}
                        grant={grant}
                        navigation={navigation}
                        style={{
                          marginBottom: 10,
                        }}
                      />
                    ))}
                  </>
                )}
              </View>
            ) : null}
          </>
        )}
        renderItem={renderItem}
        ListFooterComponent={() => (
          <>
            <TouchableOpacity
              accessibilityLabel="Apply for new organization"
              accessibilityHint="Opens the HCB application form in browser"
              accessibilityRole="button"
              onPress={() => {
                WebBrowser.openBrowserAsync("https://hackclub.com/hcb/apply", {
                  presentationStyle:
                    WebBrowser.WebBrowserPresentationStyle.POPOVER,
                  controlsColor: palette.primary,
                  dismissButtonStyle: "cancel",
                }).then(() => {
                  mutate("user/organizations");
                  mutate("user/invitations");
                });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 15,
                paddingHorizontal: 15,
                paddingVertical: 12,
                borderRadius: 8,
                justifyContent: "center",
                backgroundColor: "rgba(200,200,200,0.3)",
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={themeColors.text}
              />
              <Text style={{ color: themeColors.text }}>Create</Text>
            </TouchableOpacity>

            {organizations && organizations.length > 2 && (
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
        )}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
}
