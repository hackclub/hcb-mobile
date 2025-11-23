import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { View, ScrollView } from "react-native";

export const HomeLoadingSkeleton = () => {
  const { colors: themeColors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

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
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Icon skeleton */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: themeColors.border,
              marginRight: 16,
            }}
          />
          {/* Content skeleton */}
          <View style={{ flex: 1 }}>
            {/* Organization name skeleton */}
            <View
              style={{
                height: 20,
                backgroundColor: themeColors.border,
                borderRadius: 4,
                width: "70%",
                marginBottom: 8,
              }}
            />
            {/* Balance skeleton */}
            <View
              style={{
                height: 14,
                backgroundColor: themeColors.border,
                borderRadius: 4,
                width: "40%",
              }}
            />
          </View>
          {/* Chevron skeleton */}
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: themeColors.border,
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
};
