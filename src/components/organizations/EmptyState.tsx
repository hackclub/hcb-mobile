import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { Text } from "components/Text";
import { Platform, View } from "react-native";

import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";

interface EmptyStateProps {
  isOnline: boolean;
}

export const EmptyState = ({ isOnline }: EmptyStateProps) => {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const iconBgColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.03)";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        marginTop: 20,
      }}
    >
      {!isOnline ? (
        <>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: iconBgColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              ...(Platform.OS === "ios" && {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 8,
              }),
            }}
          >
            <Ionicons
              name="cloud-offline"
              size={36}
              color={isDark ? "#6b7280" : palette.muted}
            />
          </View>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            You're Offline
          </Text>
          <Text
            style={{
              color: isDark ? "#6b7280" : palette.muted,
              textAlign: "center",
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Please check your internet connection{"\n"}and try again
          </Text>
        </>
      ) : (
        <>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: iconBgColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              ...(Platform.OS === "ios" && {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 8,
              }),
            }}
          >
            <Icon
              glyph="payment-docs"
              color={isDark ? "#6b7280" : palette.muted}
              size={36}
            />
          </View>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            No Transactions Yet
          </Text>
          <Text
            style={{
              color: isDark ? "#6b7280" : palette.muted,
              textAlign: "center",
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Your transaction history{"\n"}will appear here
          </Text>
        </>
      )}
    </View>
  );
};
