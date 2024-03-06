import { View, useColorScheme } from "react-native";

import { palette } from "../theme";

export default function Divider() {
  const scheme = useColorScheme();

  return (
    <View
      style={{
        backgroundColor: scheme == "dark" ? palette.slate : palette.smoke,
        height: 1,
        width: "100%",
        marginBottom: 30,
      }}
    />
  );
}
