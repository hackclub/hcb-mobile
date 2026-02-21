import { useTheme } from "@react-navigation/native";

import { Text } from "./Text";
import { View } from "react-native";

export default function PageTitle({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        marginTop: 35,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 30,
          fontFamily: "Bold",
          flex: 1,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
