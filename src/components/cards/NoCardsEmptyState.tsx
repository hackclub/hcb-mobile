import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { CardsStackParamList } from "../../lib/NavigatorParamList";
import { palette } from "../../styles/theme";

type NavigationProp = NativeStackNavigationProp<CardsStackParamList, "CardList">;

export const NoCardsEmptyState = () => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleOrderCard = () => {
    navigation.navigate("OrderCard");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="card-outline"
          size={64}
          color={palette.primary}
          style={styles.icon}
        />
      </View>
      <Text style={[styles.title, { color: themeColors.text }]}>
        No Cards Yet
      </Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>
        Get started by ordering your first card from your organization
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.primary }]}
        onPress={handleOrderCard}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Order a Card</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
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
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
