import { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewProps,
} from "react-native";

import { palette } from "../theme";

export interface ButtonProps {
  onPress?: () => void;
  color?: string;
  loading?: boolean;
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
      style={{ ...styles.button, ...(props.style as object) }}
      onPress={() => props.onPress && props.onPress()}
      disabled={props.loading}
    >
      {props.loading ? (
        <ActivityIndicator color={props.color || "white"} />
      ) : (
        <Text
          style={{
            ...styles.buttonText,
            color: props.color || styles.buttonText.color,
          }}
        >
          {props.children}
        </Text>
      )}
    </Pressable>
  );
}
