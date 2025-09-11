import Icon from "@thedev132/hackclub-icons-rn";
import * as Haptics from "expo-haptics";
import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from "react-native";

import { palette } from "../styles/theme";

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
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.primary,
    borderColor: "#e85d6f",
    color: "white",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default function Button(
  props: PropsWithChildren<ViewProps & ButtonProps>,
) {
  return (
    <Pressable
      style={{
        ...styles.button,
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      {props.icon && (
        <View
          style={{
            width: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            paddingBottom: props.iconOffset || 0,
          }}
        >
          <Icon
            size={props.iconSize || 24}
            glyph={props.icon}
            style={{
              color: props.iconColor || props.color || styles.buttonText.color,
              opacity: props.loading ? 0 : 1,
            }}
          />
        </View>
      )}
      <Text
        style={{
          ...styles.buttonText,
          color: props.color || styles.buttonText.color,
          fontSize: props.fontSize || styles.buttonText.fontSize,
          fontWeight: props.fontWeight || styles.buttonText.fontWeight,
          opacity: props.loading ? 0 : 1,
        }}
      >
        {props.children}
      </Text>
      {props.loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            display: "flex",
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
