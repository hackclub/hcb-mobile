import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useState, memo, useMemo, useCallback } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Platform,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { preload, useSWRConfig } from "swr";

import Event from "../components/organizations/Event";
import GrantInvite from "../components/organizations/GrantInvite";
import { StackParamList } from "../lib/NavigatorParamList";
import useReorderedOrgs from "../lib/organization/useReorderedOrgs";
import GrantCard from "../lib/types/GrantCard";
import Invitation from "../lib/types/Invitation";
import Organization from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import { useOfflineSWR } from "../lib/useOfflineSWR";
import { palette } from "../styles/theme";
import { organizationOrderEqual } from "../utils/util";

type Props = NativeStackScreenProps<StackParamList, "Organizations">;

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

  const EventItem = memo(
    ({
      organization,
      navigation,
    }: {
      organization: Organization;
      navigation: NativeStackNavigationProp<StackParamList, "Organizations">;
    }) => {
      const drag = useReorderableDrag();
      const handlePress = useCallback(() => {
        navigation.navigate("Event", {
          orgId: organization.id,
          organization,
        });
      }, [navigation, organization]);

      return (
        <Event
          event={organization}
          drag={drag}
          isActive={false}
          showTransactions={organizations ? organizations.length <= 2 : false}
          onPress={handlePress}
        />
      );
    },
  );

  EventItem.displayName = "EventItem";

  const renderItem = useCallback(
    ({ item: organization }: { item: Organization }) => (
      <EventItem organization={organization} navigation={navigation} />
    ),
    [navigation, EventItem],
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

  if (organizations === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (organizations?.length == 0 && invitations?.length == 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="people-outline" color={palette.muted} size={60} />
        <Text style={{ color: palette.muted }}>Nothing here, yet.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ReorderableList
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
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
          padding: 20,
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
        ListHeaderComponent={() =>
          (invitations && invitations.length > 0) ||
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
                      marginTop: invitations && invitations.length > 0 ? 20 : 0,
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
          ) : null
        }
        renderItem={renderItem}
        ListFooterComponent={() =>
          organizations.length > 2 && (
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
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
}
