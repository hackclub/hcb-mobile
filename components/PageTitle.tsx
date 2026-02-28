import { useTheme } from "@react-navigation/native";
import { View } from "react-native";

import { Text } from "./Text";

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
        marginBottom: 15,
        marginTop: 35,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 37,
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
