import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { router } from "expo-router";
import { Platform, View } from "react-native";

import Button from "../Button";

import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

export const NoCardsEmptyState = ({
  onOrderCard,
}: {
  onOrderCard?: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const handleOrderCard = () => {
    if (onOrderCard) {
      onOrderCard();
      return;
    }
    router.push("/(events)");
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        backgroundColor: themeColors.background,
      }}
    >
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: isDark
            ? "rgba(236, 55, 80, 0.1)"
            : "rgba(236, 55, 80, 0.08)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          ...(Platform.OS === "ios" && {
            shadowColor: palette.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }),
        }}
      >
        <Ionicons name="card-outline" size={48} color={palette.primary} />
      </View>
      <Text
        style={{
          color: themeColors.text,
          fontSize: 26,
          fontWeight: "800",
          marginBottom: 12,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        No Cards Yet
      </Text>
      <Text
        style={{
          color: isDark ? "#7a8494" : palette.muted,
          fontSize: 16,
          textAlign: "center",
          marginBottom: 32,
          lineHeight: 24,
          paddingHorizontal: 20,
        }}
      >
        Get started by ordering your first card from your organization
      </Text>
      <Button variant="primary" icon="card" onPress={handleOrderCard}>
        Order a Card
      </Button>
    </View>
  );
};
