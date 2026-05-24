import { useTheme } from "expo-router/react-navigation";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

import { useIsDark } from "@/lib/useColorScheme";

export default function RecentTransactionsSkeleton() {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const shapeColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Animated.View
          style={{
            height: 16,
            width: "45%",
            backgroundColor: shapeColor,
            borderRadius: 6,
            opacity: shimmerOpacity,
          }}
        />
      </View>
      <View style={{ height: 1, backgroundColor: dividerColor }} />
      {[1, 2, 3, 4].map((item, index) => (
        <View key={item}>
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              opacity: shimmerOpacity,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: shapeColor,
              }}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  height: 13,
                  width: "60%",
                  backgroundColor: shapeColor,
                  borderRadius: 4,
                }}
              />
              <View
                style={{
                  height: 11,
                  width: "35%",
                  backgroundColor: shapeColor,
                  borderRadius: 4,
                }}
              />
            </View>
            <View
              style={{
                height: 13,
                width: 50,
                backgroundColor: shapeColor,
                borderRadius: 4,
              }}
            />
          </Animated.View>
          {index < 3 && (
            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginLeft: 64,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}
