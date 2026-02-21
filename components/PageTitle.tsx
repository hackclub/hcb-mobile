import { useTheme } from "@react-navigation/native";

import { Text } from "./Text";

export default function PageTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.text,
        fontSize: 30,
        marginBottom: 10,
        marginTop: 35,
        fontFamily: "Bold",
      }}
    >
      {title}
    </Text>
  );
}
