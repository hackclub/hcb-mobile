import { useTheme } from "@react-navigation/native";
import { Text as NativeText, TextProps } from "react-native";

export function Text(props: TextProps & { bold?: boolean; italic?: boolean }) {
  const { colors } = useTheme();

  return (
    <NativeText
      {...props}
      style={[
        {
          fontSize: 16,
          color: colors.text,
          fontFamily: props.bold ? "Bold" : props.italic ? "Italic" : "Regular",
        },
        props.style,
      ]}
    />
  );
}
