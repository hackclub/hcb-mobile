import { View } from "react-native";

import { useIsDark } from "../lib/useColorScheme";
import { palette } from "../styles/theme";

export default function Divider() {
  const isDark = useIsDark();

  return (
    <View
      style={{
        backgroundColor: isDark ? palette.slate : palette.smoke,
        height: 1,
        width: "100%",
        marginVertical: 15,
      }}
    />
  );
}
