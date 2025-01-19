import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from "react-native";

import { palette } from "../theme";

export interface ButtonProps {
  onPress?: () => void;
  color?: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.primary,
    borderColor: "#e85d6f",
    borderTopWidth: 1,
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
      onPress={() => props.onPress && props.onPress()}
      disabled={props.loading || props.disabled}
    >
      {props.icon && (
        <Ionicons
          name={props.icon}
          style={{ ...styles.buttonText, opacity: props.loading ? 0 : 1 }}
        />
      )}
      <Text
        style={{
          ...styles.buttonText,
          color: props.color || styles.buttonText.color,
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
