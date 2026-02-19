import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { View, Pressable, Platform } from "react-native";
import { Text } from "components/Text";

import { StackParamList } from "../../lib/NavigatorParamList";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";

type NavigationProp = NativeStackNavigationProp<StackParamList>;

export default function TapToPayBanner({
  onDismiss,
  orgId,
}: {
  onDismiss: () => void;
  orgId: `org_${string}`;
}) {
  const isDark = useIsDark();
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    navigation.navigate("OrganizationDonation", {
      orgId: orgId,
    });
  };

  const gradientColors = isDark
    ? (["#2a0a10", "#3d0f18", "#4a1220"] as const)
    : (["#fff5f6", "#ffecee", "#ffe3e6"] as const);

  const decorCircleColor = isDark
    ? "rgba(236, 55, 80, 0.12)"
    : "rgba(236, 55, 80, 0.15)";

  const decorCircleColorSecondary = isDark
    ? "rgba(236, 55, 80, 0.08)"
    : "rgba(236, 55, 80, 0.1)";

  const iconBadgeBg = isDark
    ? "rgba(236, 55, 80, 0.2)"
    : "rgba(236, 55, 80, 0.15)";

  const labelColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const titleColor = isDark ? "#fff" : "#1f2d3d";
  const subtitleColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const dismissBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const dismissBgPressed = isDark
    ? "rgba(255,255,255,0.2)"
    : "rgba(0,0,0,0.12)";
  const dismissIconColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: palette.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.4 : 0.2,
        shadowRadius: 16,
        elevation: 8,
        opacity: pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 20,
          paddingRight: 44,
          position: "relative",
          overflow: "hidden",
          borderWidth: isDark ? 0 : 1,
          borderColor: "rgba(236, 55, 80, 0.2)",
          borderRadius: 16,
        }}
      >
        {/* Decorative elements */}
        <View
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: decorCircleColor,
            top: -80,
            right: -60,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: decorCircleColorSecondary,
            bottom: -40,
            left: -30,
          }}
        />

        {/* Contactless icon badge */}
        <View
          style={{
            position: "absolute",
            top: 16,
            right: 50,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: iconBadgeBg,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "flex-end",
              transform: [{ rotate: "45deg" }],
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 10,
                height: 10,
                right: 7,
                borderWidth: 2,
                borderColor: palette.primary,
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderRadius: 100,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 16,
                height: 16,
                right: 4,
                borderWidth: 2,
                borderColor: palette.primary,
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderRadius: 100,
                opacity: 0.7,
              }}
            />
            <View
              style={{
                position: "absolute",
                width: 22,
                height: 22,
                right: 1,
                borderWidth: 2,
                borderColor: palette.primary,
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderRadius: 100,
                opacity: 0.4,
              }}
            />
          </View>
        </View>

        {/* Content */}
        <View style={{ zIndex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: palette.primary,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                NEW
              </Text>
            </View>
            <Text
              style={{
                color: labelColor,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.5,
              }}
            >
              TAP TO PAY {Platform.OS === "ios" ? "ON iPHONE" : ""}
            </Text>
          </View>

          <Text
            style={{
              color: titleColor,
              fontSize: 22,
              fontWeight: "700",
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            Accept contactless payments
          </Text>

          <Text
            style={{
              color: subtitleColor,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 14,
            }}
          >
            Turn your phone into a payment terminal. No hardware needed.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{
                color: palette.primary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Get started
            </Text>
            <Ionicons name="arrow-forward" size={14} color={palette.primary} />
          </View>
        </View>

        {/* Dismiss button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({
            position: "absolute",
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: pressed ? dismissBgPressed : dismissBg,
            justifyContent: "center",
            alignItems: "center",
          })}
        >
          <Ionicons name="close" size={18} color={dismissIconColor} />
        </Pressable>
      </LinearGradient>
    </Pressable>
  );
}
