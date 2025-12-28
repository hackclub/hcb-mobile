import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

export const LoadingSkeleton = () => {
  const { colors: themeColors } = useTheme();
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

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {[1, 2, 3, 4].map((section) => (
        <View key={section} style={{ marginBottom: 20 }}>
          <Animated.View
            style={{
              height: 14,
              backgroundColor: themeColors.border,
              borderRadius: 4,
              width: "25%",
              marginBottom: 12,
              opacity: shimmerOpacity,
            }}
          />

          {[1, 2].map((item) => (
            <View
              key={item}
              style={{
                marginBottom: 1,
                backgroundColor: themeColors.card,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderRadius: item === 1 ? 8 : 0,
                borderBottomLeftRadius: item === 2 ? 8 : 0,
                borderBottomRightRadius: item === 2 ? 8 : 0,
                borderTopLeftRadius: item === 1 ? 8 : 0,
                borderTopRightRadius: item === 1 ? 8 : 0,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: themeColors.border,
                  borderRadius: 10,
                }}
              />

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    height: 14,
                    backgroundColor: themeColors.border,
                    borderRadius: 4,
                    width: "80%",
                  }}
                />
              </View>

              <View
                style={{
                  height: 14,
                  backgroundColor: themeColors.border,
                  borderRadius: 4,
                  width: "15%",
                }}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
