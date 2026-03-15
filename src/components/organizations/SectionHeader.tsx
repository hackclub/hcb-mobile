import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { View } from "react-native";

import { palette } from "../../styles/theme";

export default function SectionHeader({ title }: { title: string }) {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: themeColors.background,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 5,
      }}
    >
      <Text
        style={{
          color: palette.muted,
          fontSize: 10,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
}
