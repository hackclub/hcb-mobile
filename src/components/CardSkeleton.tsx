import { Animated, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import Button from "./Button";
import { palette } from "../theme";

interface CardSkeletonProps {
  onRefresh: () => void;
}

export default function CardSkeleton({ onRefresh }: CardSkeletonProps) {
  const { colors: themeColors } = useTheme();
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create skeleton loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [skeletonAnim]);

  // Create the interpolated background color for skeleton animation
  const skeletonBackground = skeletonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0, 0, 0, 0.03)", "rgba(0, 0, 0, 0.12)"],
  });

  // Create a shared skeleton style for reuse
  const createSkeletonStyle = (
    width: number,
    height: number,
    extraStyles = {},
  ) => ({
    width,
    height,
    backgroundColor: skeletonBackground,
    borderRadius: 8,
    overflow: "hidden" as const,
    ...extraStyles,
  });

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Card preview skeleton */}
      <Animated.View
        style={{
          height: 200,
          borderRadius: 16,
          marginBottom: 20,
          backgroundColor: skeletonBackground,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            width: "70%",
          }}
        >
          <Animated.View
            style={createSkeletonStyle(120, 16, { marginBottom: 10 })}
          />
          <Animated.View style={createSkeletonStyle(180, 26)} />
        </View>
      </Animated.View>

      <View
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 4,
          backgroundColor: themeColors.card,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Animated.View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: skeletonBackground,
              marginRight: 16,
            }}
          />
          <View>
            <Animated.View
              style={createSkeletonStyle(140, 20, { marginBottom: 8 })}
            />
            <Animated.View style={createSkeletonStyle(90, 14)} />
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            marginVertical: 10,
          }}
        />

        <View style={{ marginTop: 16, gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: themeColors.text,
              }}
            >
              Card number
            </Text>
            <Animated.View style={createSkeletonStyle(140, 22)} />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: themeColors.text,
              }}
            >
              Expires
            </Text>
            <Animated.View style={createSkeletonStyle(70, 22)} />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: themeColors.text,
              }}
            >
              CVC
            </Text>
            <Animated.View style={createSkeletonStyle(50, 22)} />
          </View>
        </View>
      </View>

      <View
        style={{
          marginBottom: 28,
          flexDirection: "row",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Animated.View
          style={{
            flexBasis: 0,
            flexGrow: 1,
            height: 50,
            backgroundColor: skeletonBackground,
            borderRadius: 12,
          }}
        />
        <Animated.View
          style={{
            flexBasis: 0,
            flexGrow: 1,
            height: 50,
            backgroundColor: skeletonBackground,
            borderRadius: 12,
          }}
        />
      </View>

      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Animated.View style={createSkeletonStyle(160, 22)} />
          <Animated.View style={createSkeletonStyle(80, 22)} />
        </View>

        <View style={{ gap: 12 }}>
          {[1, 2, 3].map((_, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <Animated.View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: skeletonBackground,
                  marginRight: 16,
                }}
              />
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Animated.View style={createSkeletonStyle(120, 16)} />
                  <Animated.View style={createSkeletonStyle(70, 16)} />
                </View>
                <Animated.View style={createSkeletonStyle(100, 12)} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
} 