import { useTheme } from "@react-navigation/native";
import { View } from "react-native";

export const LoadingSkeleton = () => {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {[1, 2, 3, 4, 5].map((section) => (
        <View key={section} style={{ marginBottom: 24 }}>
          <View
            style={{
              height: 14,
              backgroundColor: themeColors.border,
              borderRadius: 4,
              width: "25%",
              marginBottom: 12,
              marginLeft: 10,
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
