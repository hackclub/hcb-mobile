import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ScrollView, View } from "react-native";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

const FEATURE_ROWS: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
}[] = [
  {
    icon: "card-outline",
    title: "Order physical and virtual cards",
    description:
      "Easily order physical and virtual cards for your organization to streamline spending and manage expenses.",
  },
  {
    icon: "eye-outline",
    title: "Control spending with ease",
    description:
      "Set spending limits and monitor transactions in real-time to ensure responsible use of funds.",
  },
  {
    icon: "document-text-outline",
    title: "Simplify expense tracking",
    description:
      "Automatically categorize and track expenses, making budgeting and financial reporting a breeze.",
  },
];

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

  const iconBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <ScrollView
      style={{
        flex: 1,
        padding: 24,
        backgroundColor: themeColors.background,
      }}
    >
      <View style={{ gap: 28, marginBottom: 36 }}>
        {FEATURE_ROWS.map((row) => (
          <View
            key={row.icon}
            style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: iconBg,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ionicons name={row.icon} size={26} color={themeColors.text} />
            </View>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                {row.title}
              </Text>
              <Text
                style={{
                  color: isDark ? "#7a8494" : palette.muted,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {row.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        variant="green"
        icon="card-add"
        iconSize={24}
        iconPosition="left"
        onPress={handleOrderCard}
      >
        Order a card
      </Button>
    </ScrollView>
  );
};
