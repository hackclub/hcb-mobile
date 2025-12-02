import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState, memo } from "react";
import {
  GestureResponderEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import User from "../lib/types/User";
import { useOfflineSWR } from "../lib/useOfflineSWR";
import { useIsTeen } from "../utils/age";

const PROMO_BANNER_CLICKED_KEY = "@promoBannerClicked";

const PromoBanner = memo(function PromoBanner() {
  const isTeen = useIsTeen();
  const [isVisible, setIsVisible] = useState(false);
  const { colors } = useTheme();
  const { data: user } = useOfflineSWR<User>("user");
  useEffect(() => {
    const checkVisibility = async () => {
      const isDecember = new Date().getMonth() === 11;
      const hasBeenClicked =
        (await AsyncStorage.getItem(PROMO_BANNER_CLICKED_KEY)) == "true";

      if (isTeen && isDecember && !hasBeenClicked) {
        setIsVisible(true);
      }
    };

    checkVisibility();
  }, [isTeen]);

  const handlePress = async () => {
    Linking.openURL(
      `https://hack.club/hcb-mobile-stickers?user_id=${encodeURIComponent(user?.id || "")}&name=${encodeURIComponent(user?.name || "")}`,
    );
  };

  const handleClose = async (e: GestureResponderEvent) => {
    e.stopPropagation();
    try {
      await AsyncStorage.setItem(PROMO_BANNER_CLICKED_KEY, "true");
      setIsVisible(false);
    } catch (error) {
      console.error("Error saving promo banner dismiss", error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>🎁</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>
            Claim your free HCB stickers! →
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Limited edition stickers for early app adopters!
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </Pressable>
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
  icon: {
    fontSize: 24,
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
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
    borderRadius: 10,
  },
  closeButtonPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  closeText: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.5,
  },
});

export default PromoBanner;
