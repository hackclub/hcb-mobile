import { useTheme } from "expo-router/react-navigation";
import Icon from "@thedev132/hackclub-icons-rn";
import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from "react-native";

import { palette } from "@/styles/theme";
import * as Haptics from "@/utils/haptics";

export interface ButtonProps {
  onPress?: () => void;
  color?: string;
  iconColor?: string;
  fontSize?: number;
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Icon>["glyph"];
  iconSize?: number;
  iconOffset?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
  iconPosition?: "left" | "right";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "info" | "success" | "error" | "green";
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.primary,
    borderColor: "#e85d6f",
    borderWidth: 1,
    color: "white",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default function Button(
  props: PropsWithChildren<ViewProps & ButtonProps>,
) {
  const theme = useTheme();
  const { variant = "primary", iconPosition = "right" } = props;

  const variantBaseStyle = {
    ...styles.button,
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          ...variantBaseStyle,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case "outline":
        return {
          ...variantBaseStyle,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: palette.primary,
        };
      case "ghost":
        return {
          ...variantBaseStyle,
          backgroundColor: "transparent",
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "green":
        return {
          ...variantBaseStyle,
          backgroundColor: "#33d6a0",
          borderColor: "#33d6a0",
        };
      case "primary":
      default:
        return variantBaseStyle;
    }
  };

  const getTextColor = () => {
    if (props.color) return props.color;

    switch (variant) {
      case "secondary":
        return theme.colors.text;
      case "outline":
        return palette.primary;
      case "ghost":
        return theme.colors.text;
      case "green":
        return "#0d2b1f";
      case "primary":
      default:
        return "#FFFFFF";
    }
  };

  const getTextStyles = () => ({
    ...styles.buttonText,
    color: getTextColor(),
    fontSize: props.fontSize || styles.buttonText.fontSize,
    fontWeight: props.fontWeight || styles.buttonText.fontWeight,
    opacity: props.loading ? 0 : variant === "ghost" ? 0.8 : 1,
  });

  return (
    <Pressable
      style={{
        ...getVariantStyles(),
        ...(props.style as object),
        ...(props.disabled
          ? {
              backgroundColor: palette.muted,
              borderColor: palette.muted,
              opacity: 0.6,
            }
          : {}),
      }}
      onPress={() => {
        if (props.hapticFeedback !== false) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        }
        props.onPress && props.onPress();
      }}
      disabled={props.loading || props.disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={
        props.accessibilityLabel ||
        (typeof props.children === "string" ? props.children : "Button")
      }
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{
        disabled: props.disabled || props.loading,
        busy: props.loading,
      }}
    >
      {props.icon && iconPosition === "left" && (
        <View
          style={{
            width: 26,
            height: 26,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: props.iconOffset || 0,
          }}
        >
          <Icon
            size={props.iconSize || 16}
            glyph={props.icon}
            style={{
              color: props.iconColor || props.color || getTextColor(),
              opacity: props.loading ? 0 : 1,
            }}
          />
        </View>
      )}
      <Text style={getTextStyles()}>{props.children}</Text>
      {props.icon && iconPosition === "right" && (
        <View
          style={{
            width: 26,
            height: 26,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: props.iconOffset || 0,
          }}
        >
          <Icon
            size={props.iconSize || 16}
            glyph={props.icon}
            style={{
              color: props.iconColor || props.color || getTextColor(),
              opacity: props.loading ? 0 : 1,
            }}
          />
        </View>
      )}
      {props.loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={props.color || "white"} />
        </View>
      )}
    </Pressable>
  );
}
