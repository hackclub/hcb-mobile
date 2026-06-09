import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useTheme } from "expo-router/react-navigation";
import { memo } from "react";
import { View, TouchableHighlight, StyleSheet, ViewProps } from "react-native";
import useSWR from "swr";

import EventBalance from "./EventBalance";

import { Text } from "@/components/Text";
import Invitation from "@/lib/types/Invitation";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { cardBorderColor, palette } from "@/styles/theme";
import * as Haptics from "@/utils/haptics";
import { orgColor } from "@/utils/org";

const Event = memo(
  function Event({
    event,
    hideBalance = false,
    onPress,
    drag,
    isActive,
    style,
    invitation,
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
      { keepPreviousData: true },
    );

    const { colors: themeColors } = useTheme();
    useStripeTerminalInit({
      organizationId: event?.id,
      enabled: !!(event && !event.playground_mode),
    });

    const color = orgColor(event.id);
    const isDark = useIsDark();

    const contentView = (
      <>
        <View
          style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
        >
          {event.icon ? (
            <Image
              source={{ uri: event.icon }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                marginRight: 14,
              }}
            />
          ) : (
            <View
              style={{
                borderRadius: 10,
                width: 52,
                height: 52,
                backgroundColor: color,
                marginRight: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}
          <View style={{ flexDirection: "column", flex: 1 }}>
            {invitation && invitation.sender && (
              <Text
                style={{
                  color: isDark ? palette.muted : palette.slate,
                  marginBottom: 3,
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {invitation.sender.name}
                </Text>{" "}
                invited you to
              </Text>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: themeColors.text,
                  fontSize: 16,
                  fontWeight: "600",
                  flexShrink: 1,
                }}
              >
                {event.name}
              </Text>
              {data?.playground_mode && (
                <View
                  style={{
                    backgroundColor: isDark ? "#1a2d45" : "#dbeeff",
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                    borderRadius: 9999,
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? "#6cb4f5" : "#1a6fbf",
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    Playground
                  </Text>
                </View>
              )}
            </View>
            {!hideBalance && (
              <View style={{ marginTop: 4 }}>
                <EventBalance balance_cents={data?.balance_cents} />
              </View>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? palette.muted : palette.slate}
          />
        </View>
      </>
    );

    return (
      <TouchableHighlight
        onPress={onPress}
        onLongPress={() => {
          Haptics.dragStartAsync();
          drag?.();
        }}
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
              borderWidth: 1,
              borderColor: cardBorderColor(isDark),
            }}
          >
            <Image
              source={{ uri: event.background_image }}
              cachePolicy="memory-disk"
              placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
              placeholderContentFit="cover"
              transition={0}
              recyclingKey={event.background_image}
              priority="high"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                backgroundColor: themeColors.card,
              }}
              contentFit="cover"
            />
            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(37, 36, 41, 0.85)"
                  : "rgba(255, 255, 255, 0.88)",
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
                borderRadius: 8,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: cardBorderColor(isDark),
              },
              style,
            )}
          >
            {contentView}
          </View>
        )}
      </TouchableHighlight>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.name === nextProps.event.name &&
      prevProps.event.icon === nextProps.event.icon &&
      prevProps.event.background_image === nextProps.event.background_image &&
      prevProps.hideBalance === nextProps.hideBalance &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.invitation?.id === nextProps.invitation?.id
    );
  },
);

export default Event;
