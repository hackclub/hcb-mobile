import { useTheme } from "expo-router/react-navigation";
import { Text as NativeText, TextProps } from "react-native";

export function Text(props: TextProps & { bold?: boolean; italic?: boolean }) {
  const { colors } = useTheme();
  const { bold, italic, style, ...rest } = props;

  return (
    <NativeText
      {...rest}
      style={[
        {
          fontSize: 16,
          color: colors.text,
          ...(bold && { fontWeight: "bold" }),
          ...(italic && { fontStyle: "italic" }),
        },
        style,
      ]}
    />
  );
}
