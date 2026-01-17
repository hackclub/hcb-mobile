import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { View, ScrollView, Animated, Platform } from "react-native";

import { useIsDark } from "../../lib/useColorScheme";

export const HomeLoadingSkeleton = () => {
  const { colors: themeColors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const isDark = useIsDark();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const skeletonBg = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : "rgba(0, 0, 0, 0.04)";
  const skeletonItemBg = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: tabBarHeight + 20,
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            ...(Platform.OS === "ios" && {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.08,
              shadowRadius: 8,
            }),
            ...(Platform.OS === "android" && {
              elevation: isDark ? 4 : 2,
            }),
          }}
        >
          {/* Icon skeleton */}
          <Animated.View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: skeletonBg,
              marginRight: 14,
              opacity: shimmerOpacity,
            }}
          />
          {/* Content skeleton */}
          <View style={{ flex: 1, gap: 8 }}>
            {/* Organization name skeleton */}
            <Animated.View
              style={{
                height: 18,
                backgroundColor: skeletonItemBg,
                borderRadius: 6,
                width: "65%",
                opacity: shimmerOpacity,
              }}
            />
            {/* Balance skeleton */}
            <Animated.View
              style={{
                height: 14,
                backgroundColor: skeletonBg,
                borderRadius: 6,
                width: "35%",
                opacity: shimmerOpacity,
              }}
            />
          </View>
          {/* Chevron skeleton */}
          <Animated.View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: skeletonBg,
              opacity: shimmerOpacity,
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
};
