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
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.primary,
    borderColor: "#e85d6f",
    borderTopWidth: 1,
    color: "white",
    padding: 10,
    borderRadius: 10,
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
        opacity: props.disabled ? 0.6 : undefined,
      }}
      onPress={() => props.onPress && props.onPress()}
      disabled={props.loading || props.disabled}
    >
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
