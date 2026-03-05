import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";

import { palette } from "../../styles/theme";

export default function SectionHeader({ title }: { title: string }) {
  const { colors: themeColors } = useTheme();
  return (
    <Text
      style={{
        color: palette.muted,
        backgroundColor: themeColors.background,
        paddingTop: 10,
        paddingBottom: 5,
        fontSize: 10,
        textTransform: "uppercase",
      }}
    >
      {title}
    </Text>
  );
}
