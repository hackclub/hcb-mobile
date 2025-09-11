import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import { Image } from "expo-image";
import { memo, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  ViewProps,
} from "react-native";
import useSWR from "swr";

import { logError } from "../../lib/errorUtils";
import Invitation from "../../lib/types/Invitation";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../theme";
import { orgColor } from "../../util";

import EventBalance from "./EventBalance";

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
          if (isTapToPayEnabled == "true") {
            return;
          }

          // Check if terminal is available before initializing
          if (!terminal) {
            logError(
              "Stripe Terminal not available",
              new Error("Terminal instance is null"),
              {
                context: { organizationId: event?.id },
              },
            );
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
          setTerminalInitialized(false);
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

export default Event;
