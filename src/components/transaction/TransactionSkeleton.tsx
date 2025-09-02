import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { View, ScrollView, Animated, StyleProp, ViewStyle } from "react-native";

function SkeletonBox({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors: themeColors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: themeColors.card,
          opacity,
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

export default function TransactionSkeleton() {
  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
    >
      {/* Admin Tools */}
      <View style={{ marginBottom: 20 }}>
        <SkeletonBox style={{ height: 30, width: "100%" }} />
      </View>

      {/* Transaction Title */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <SkeletonBox style={{ height: 40, width: "60%", marginBottom: 20 }} />
      </View>

      {/* Transaction Details */}
      <View style={{ marginBottom: 30 }}>
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            style={{
              backgroundColor: themeColors.card,
              padding: 10,
              borderTopLeftRadius: index === 1 ? 8 : 0,
              borderTopRightRadius: index === 1 ? 8 : 0,
              borderBottomLeftRadius: index === 3 ? 8 : 0,
              borderBottomRightRadius: index === 3 ? 8 : 0,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <SkeletonBox style={{ height: 20, width: "30%" }} />
            <SkeletonBox style={{ height: 20, width: "50%" }} />
          </View>
        ))}
      </View>

      {/* Comments Section */}
      <View style={{ gap: 20 }}>
        {[1, 2].map((index) => (
          <View key={index} style={{ gap: 10 }}>
            <SkeletonBox style={{ height: 20, width: "40%" }} />
            <SkeletonBox style={{ height: 40, width: "100%" }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
