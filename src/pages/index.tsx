import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useState, useRef, memo, useMemo, useCallback } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  TouchableHighlight,
  ViewProps,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  Platform,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import ReorderableList, {
  useReorderableDrag,
} from "react-native-reorderable-list";
import useSWR, { preload, useSWRConfig } from "swr";

import { logError } from "../lib/errorUtils";
import { StackParamList } from "../lib/NavigatorParamList";
import useReorderedOrgs from "../lib/organization/useReorderedOrgs";
import Invitation from "../lib/types/Invitation";
import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import { useIsDark } from "../lib/useColorScheme";
import { palette } from "../theme";
import { orgColor, organizationOrderEqual, renderMoney } from "../util";

function EventBalance({ balance_cents }: { balance_cents?: number }) {
  return balance_cents !== undefined ? (
    <Text style={{ color: palette.muted, fontSize: 16, marginTop: 5 }}>
      {renderMoney(balance_cents)}
    </Text>
  ) : (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
        gap: 1,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 16 }}>$</Text>
      <View
        style={{
          backgroundColor: palette.slate,
          width: 100,
          height: 12,
          borderRadius: 4,
        }}
      />
    </View>
  );
}

const Event = memo(function Event({
  event,
  hideBalance = false,
  onPress,
  drag,
  isActive,
  style,
  invitation,
  // showTransactions = false,
}: ViewProps & {
  event: Organization;
  hideBalance?: boolean;
  showTransactions?: boolean;
  invitation?: Invitation;
  onPress?: () => void;
  isActive?: boolean;
  drag?: () => void;
}) {
  const { data } = useSWR<OrganizationExpanded>(
    hideBalance ? null : `organizations/${event.id}`,
  );
  // const { data: transactions, isLoading: transactionsIsLoading } = useSWR<
  //   PaginatedResponse<ITransaction>
  // >(showTransactions ? `organizations/${event.id}/transactions?limit=5` : null);

  const { colors: themeColors } = useTheme();
  const terminal = useStripeTerminal();
  const [terminalInitialized, setTerminalInitialized] = useState(false);

  const color = orgColor(event.id);
  const isDark = useIsDark();

  useEffect(() => {
    (async () => {
      if (event && !event.playground_mode && !terminalInitialized) {
        try {
          const isTapToPayEnabled =
            await AsyncStorage.getItem("isTapToPayEnabled");
          if (isTapToPayEnabled) {
            return;
          }
          await terminal.initialize();
          setTerminalInitialized(true);
          // Only call supportsReadersOfType if initialize did not throw
          const supported = await terminal.supportsReadersOfType({
            deviceType: "tapToPay",
            discoveryMethod: "tapToPay",
          });
          await AsyncStorage.setItem(
            "isTapToPayEnabled",
            supported ? "true" : "false",
          );
        } catch (error) {
          logError("Stripe Terminal initialization error", error, {
            context: { organizationId: event?.id },
          });
        }
      } else if (!event || event.playground_mode) {
        setTerminalInitialized(false);
      }
    })();
  }, [event, terminal, terminalInitialized]);

  const contentView = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        {event.icon ? (
          <Image
            source={{ uri: event.icon }}
            cachePolicy="memory-disk"
            contentFit="scale-down"
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              marginRight: 16,
            }}
          />
        ) : (
          <View
            style={{
              borderRadius: 8,
              width: 40,
              height: 40,
              backgroundColor: color,
              marginRight: 16,
            }}
          ></View>
        )}
        <View
          style={{
            flexDirection: "column",
            flex: 1,
          }}
        >
          {invitation && invitation.sender && (
            <Text style={{ color: palette.muted, marginBottom: 3 }}>
              <Text style={{ fontWeight: "600" }}>
                {invitation.sender.name}
              </Text>{" "}
              invited you to
            </Text>
          )}
          <Text
            numberOfLines={2}
            style={{
              color: themeColors.text,
              fontSize: 20,
              fontWeight: "600",
            }}
          >
            {event.name}
          </Text>
          {data?.playground_mode && (
            <View
              style={{
                backgroundColor: isDark ? "#283140" : "#348EDA",
                paddingVertical: 4,
                paddingHorizontal: 12,
                borderRadius: 20,
                alignSelf: "flex-start",
                marginVertical: 4,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#248EDA" : "white",
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                Playground Mode
              </Text>
            </View>
          )}
          {!hideBalance && <EventBalance balance_cents={data?.balance_cents} />}
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={24}
          color={palette.muted}
        />
      </View>
      {/* {transactions?.data && transactions.data.length >= 1 ? (
        <>
          {transactions.data.map((tx, index) => (
            <Transaction
              transaction={tx}
              orgId={event.id}
              key={tx.id}
              bottom={index == transactions.data.length - 1}
              hideMissingReceipt
            />
          ))}
          {transactions.has_more && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 10,
              }}
            >
              <Text style={{ color: palette.info }}>See more activity</Text>
              <Ionicons name="chevron-forward" color={palette.info} size={18} />
            </View>
          )}
        </>
      ) : transactionsIsLoading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      ) : null} */}
    </>
  );

  return (
    <TouchableHighlight
      onPress={onPress}
      onLongPress={drag}
      disabled={isActive}
      underlayColor={isActive ? "transparent" : themeColors.background}
      activeOpacity={isActive ? 1 : 0.7}
    >
      {event.background_image ? (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 10,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Image
            source={{ uri: event.background_image }}
            cachePolicy="memory-disk"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }}
            contentFit="cover"
          />
          <View
            style={{
              backgroundColor: isDark
                ? "rgba(37, 36, 41, 0.85)"
                : "rgba(255, 255, 255, 0.7)",
              borderRadius: 10,
              position: "relative",
              zIndex: 1,
            }}
          >
            {contentView}
          </View>
        </View>
      ) : (
        <View
          style={StyleSheet.compose(
            {
              backgroundColor: themeColors.card,
              borderRadius: 10,
              overflow: "hidden",
            },
            style,
          )}
        >
          {contentView}
        </View>
      )}
    </TouchableHighlight>
  );
});

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

  const shouldFetch = () => {
    const now = Date.now();
    if (!isOnline) return false;
    if (now - lastFetchTime.current < FETCH_COOLDOWN_MS) return false;
    lastFetchTime.current = now;
    return true;
  };

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
      }, [navigation, organization.id, organization]);

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
