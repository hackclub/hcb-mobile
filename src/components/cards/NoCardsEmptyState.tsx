import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet } from "react-native";

import { palette } from "../../styles/theme";

export const NoCardsEmptyState = () => {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <Ionicons
        name="card-outline"
        size={64}
        color={palette.muted}
        style={styles.icon}
      />
      <Text style={[styles.title, { color: themeColors.text }]}>
        No Cards Yet
      </Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>
        Get started by ordering your first card from your organization
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  icon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
});
