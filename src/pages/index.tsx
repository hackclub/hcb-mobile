import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import * as BackgroundTask from 'expo-background-task';
import * as Haptics from "expo-haptics";
import * as QuickActions from "expo-quick-actions";
import { useShareIntentContext } from "expo-share-intent";
import * as TaskManager from 'expo-task-manager';
import { useEffect, useState, useRef, memo, useMemo, useCallback } from "react";
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
import useSWR, { mutate, preload, useSWRConfig } from "swr";

import Event from "../components/organizations/Event";
import { logCriticalError, logError } from "../lib/errorUtils";
import { StackParamList } from "../lib/NavigatorParamList";
import useReorderedOrgs from "../lib/organization/useReorderedOrgs";
import Invitation from "../lib/types/Invitation";
import Organization from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import { palette } from "../theme";
import { organizationOrderEqual } from "../util";

const BACKGROUND_TASK_IDENTIFIER = 'refresh-data';

TaskManager.defineTask(BACKGROUND_TASK_IDENTIFIER, async () => {
  try {
    // Only attempt to mutate if we have network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log("Background task skipped: no network connection");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await Promise.all([
      mutate((k) => typeof k === "string" && k.startsWith("organizations/")),
      mutate((k) => typeof k === "string" && k.startsWith("user/")),
    ]);
    
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    logCriticalError('Failed to execute the background task:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

async function registerBackgroundTaskAsync() {
  return BackgroundTask.registerTaskAsync(BACKGROUND_TASK_IDENTIFIER, {
    minimumInterval: 60 * 60, // 1 hour in seconds
  });
}

type Props = NativeStackScreenProps<StackParamList, "Organizations">;

/* eslint-disable react/prop-types */
export default function App({ navigation }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN_MS = 10000;
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const {
    data: missingReceiptData,
    error: missingReceiptError,
    mutate: refetchMissingReceipts,
  } = useSWR<{
    data: (ITransaction & { organization: Organization })[];
  }>(hasShareIntent ? "user/transactions/missing_receipt" : null);

  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [shareIntentProcessed, setShareIntentProcessed] = useState(false);
  const [refreshing] = useState(false);

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
    (async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_IDENTIFIER);
        if (!isRegistered) {
          await registerBackgroundTaskAsync();
        }
      } catch (error) {
        logError("Failed to register background task:", error);
      }
    })();
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
        }
        // If we don't have missing receipt data yet, but also no error, wait a bit more
        else if (!missingReceiptError && !missingReceiptData) {
          // Don't process yet, wait for data to load
        }
        // If we have an error or no missing receipts, still show the modal for receipt bin upload
        else {
          if (missingReceiptError) {
            logError(
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

  // Reset share intent processed flag when share intent changes
  useEffect(() => {
    if (hasShareIntent) {
      setShareIntentProcessed(false);
    }
  }, [hasShareIntent]);

  // Cleanup share intent on unmount or when component reinitializes
  useEffect(() => {
    return () => {
      // Reset share intent when component unmounts to prevent conflicts
      if (hasShareIntent) {
        resetShareIntent();
      }
    };
  }, [hasShareIntent, resetShareIntent]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const shouldFetch = useCallback(() => {
    const now = Date.now();
    if (!isOnline) return false;
    if (now - lastFetchTime.current < FETCH_COOLDOWN_MS) return false;
    lastFetchTime.current = now;
    return true;
  }, [isOnline]);

  const {
    data: organizations,
    error,
    mutate: reloadOrganizations,
  } = useSWR<Organization[]>(isOnline ? "user/organizations" : null, {
    fallbackData: [],
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 2000,
    shouldRetryOnError: false,
    keepPreviousData: true,
    onError: (err) => {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error fetching organizations:", err);
      }
    },
  });

  const [sortedOrgs, setSortedOrgs] = useReorderedOrgs(organizations);
  const { data: invitations, mutate: reloadInvitations } = useSWR<Invitation[]>(
    isOnline ? "user/invitations" : null,
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      shouldRetryOnError: false,
      keepPreviousData: true,
      onError: (err) => {
        if (err.name !== "AbortError" && err.name !== "NetworkError") {
          logError("Error fetching invitations:", err);
        }
      },
    },
  );

  const { fetcher, mutate } = useSWRConfig();
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();
  const usePanGesture = () =>
    useMemo(() => Gesture.Pan().activateAfterLongPress(520), []);
  const panGesture = usePanGesture();

  useEffect(() => {
    if (Platform.OS === "ios") {
      QuickActions.setItems([
        ...(sortedOrgs?.[0] ? [{
          id: `org_${sortedOrgs[0].id}`,
          title: sortedOrgs[0].name,
          subtitle: "Open your favorite org 💰",
          icon: "symbol:dollarsign.bank.building",
          params: { href: `/${sortedOrgs[0].id}` }
        }] : []),
        {
          id: "cards", 
          title: "Cards",
          subtitle: "View your cards 💳",
          icon: "symbol:creditcard",
          params: { href: `/cards` }
        },
        {
          id: "receipts", 
          title: "Upload your receipts",
          subtitle: "before Leo gets mad 😡",
          icon: "symbol:text.document",
          params: { href: `/receipts` }
        },
        {
          id: "settings", 
          title: "Settings",
          icon: "symbol:gearshape",
          params: { href: `/settings` }
        },
      ]);
    }
  }, [sortedOrgs]);

  useEffect(() => {
    if (!shouldFetch()) return;

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        preload("user", fetcher!);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        preload("user/cards", fetcher!);
        // prefetch all user organization details
        for (const org of organizations || []) {
          preload(`organizations/${org.id}`, fetcher!);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error preloading data:", err);
      }
    }
  }, [organizations, fetcher, isOnline, shouldFetch]);

  const onRefresh = () => {
    if (!shouldFetch()) return;

    try {
      reloadOrganizations();
      reloadInvitations();
      mutate((k) => typeof k === "string" && k.startsWith("organizations"));
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error refreshing data:", err);
      }
    }
  };

  useFocusEffect(() => {
    if (!shouldFetch()) return;

    try {
      reloadOrganizations();
      reloadInvitations();
      mutate((k) => typeof k === "string" && k.startsWith("organizations"));
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "NetworkError") {
        logError("Error reloading data on focus:", err);
      }
    }
  });

  const renderItem = useCallback(
    ({ item: organization }: { item: Organization }) => (
      <EventItem organization={organization} navigation={navigation} />
    ),
    [navigation],
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
        invitations &&
        invitations.length > 0 && (
          <View
            style={{
              marginTop: 10,
              marginBottom: 20,
              borderRadius: 10,
            }}
          >
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
              // <TouchableHighlight key={invitation.id}>
              //   <Text
              //     style={{
              //       color: palette.smoke,
              //       backgroundColor: palette.darkless,
              //       padding: 10,
              //       borderRadius: 10,
              //       overflow: "hidden",
              //     }}
              //   >
              //     {invitation.organization.name}
              //   </Text>
              // </TouchableHighlight>
            ))}
          </View>
        )
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
  );
}
