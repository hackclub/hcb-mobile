import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import User from "../lib/types/User";
import { useOfflineSWR } from "../lib/useOfflineSWR";
import { palette } from "../styles/theme";

// A standing notice shown while the cardholder's cards are locked for overdue
// receipts. It is not dismissible: the state is only cleared by uploading a
// receipt, which unlocks the cards within seconds. Mirrors the web banner.
const CardLockBanner = memo(function CardLockBanner({
  onPress,
}: {
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const { data: user } = useOfflineSWR<User>("user");

  const cardLocking = user?.card_locking;
  if (!cardLocking?.locked) {
    return null;
  }

  const count = cardLocking.overdue_receipt_count;
  const subtitle =
    count > 0
      ? `Upload your ${count} overdue ${count === 1 ? "receipt" : "receipts"} and your cards work again in seconds.`
      : "Upload your overdue receipts and your cards work again in seconds.";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderColor: palette.primary },
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={22} color={palette.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: palette.primary }]}>
            Your cards are locked
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {subtitle}
          </Text>
        </View>
        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
  },
});

export default CardLockBanner;
