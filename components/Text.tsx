import { Text as NativeText, TextProps } from "react-native";

export function Text(props: TextProps & { bold?: boolean; italic?: boolean }) {
  return (
    <NativeText
      {...props}
      style={[
        {
          fontSize: 16,
          fontFamily: props.bold ? "Bold" : props.italic ? "Italic" : "Regular",
        },
        props.style,
      ]}
    />
  );
}
