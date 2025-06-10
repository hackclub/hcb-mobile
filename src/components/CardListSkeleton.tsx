import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { Animated, View, useWindowDimensions } from "react-native";

export default function CardListSkeleton() {
  const { colors: themeColors } = useTheme();
  const { width } = useWindowDimensions();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.8],
  });

  const cardWidth = width * 0.86;
  const cardHeight = cardWidth / 1.588;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {[1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: 15,
            marginBottom: 16,
            backgroundColor: themeColors.border,
            overflow: "hidden",
            padding: 30,
            justifyContent: "flex-end",
          }}
        >
          <View style={{ gap: 10 }}>
            <Animated.View
              style={{
                width: 180,
                height: 18,
                backgroundColor: themeColors.card,
                borderRadius: 4,
                opacity: shimmerOpacity,
              }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Animated.View
                style={{
                  width: 180,
                  height: 18,
                  backgroundColor: themeColors.card,
                  borderRadius: 4,
                  opacity: shimmerOpacity,
                }}
              />
              <Animated.View
                style={{
                  width: 80,
                  height: 20,
                  backgroundColor: themeColors.card,
                  borderRadius: 15,
                  position: "absolute",
                  right: 0,
                  opacity: shimmerOpacity,
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
