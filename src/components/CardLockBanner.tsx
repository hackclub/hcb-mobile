import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import User from "../lib/types/User";
import { useOfflineSWR } from "../lib/useOfflineSWR";

// A standing notice shown while the cardholder's cards are locked for overdue
// receipts. It is not dismissible: the state is only cleared by uploading a
// receipt, which unlocks the cards within seconds. Mirrors the web banner.
//
// Pass `user` to reuse a user already loaded by the parent; otherwise it is
// fetched. `card_locking` is present only when the feature is enabled for the
// current user, so the banner renders nothing for everyone else.
export default function CardLockBanner({
  onPress,
  user: userProp,
}: {
  onPress: () => void;
  user?: User;
}) {
  const { colors } = useTheme();
  const { data: fetchedUser } = useOfflineSWR<User>(userProp ? null : "user");
  const user = userProp ?? fetchedUser;

  const cardLocking = user?.card_locking;
  if (!cardLocking?.locked) {
    return null;
  }

  const count = cardLocking.overdue_receipt_count;
  const lead =
    count > 0
      ? `Upload your ${count} overdue ${count === 1 ? "receipt" : "receipts"} and your cards work again in seconds.`
      : "Upload your overdue receipts and your cards work again in seconds.";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.primary },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={22} color={colors.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>
            Your cards are locked
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {lead} Recurring charges will keep failing until you upload.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </View>
    </Pressable>
  );
}

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
