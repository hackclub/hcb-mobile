import { useColorScheme } from "react-native";

import { useThemeContext } from "@/lib/providers/ThemeContext";
import { lightTheme, theme } from "@/styles/theme";

export function useNavTheme() {
  const scheme = useColorScheme();
  const { theme: themePref } = useThemeContext();

  if (themePref === "dark") return theme;
  if (themePref === "system") return scheme === "dark" ? theme : lightTheme;
  return lightTheme;
}

export default useNavTheme;
