import { useColorScheme as useSystemColorScheme } from "react-native";

import { useThemeContext } from "../providers/ThemeContext";

export function useColorScheme() {
  const { theme } = useThemeContext();
  const systemColorScheme = useSystemColorScheme();

  return theme === "system" ? systemColorScheme : theme;
}

export function useIsDark() {
  const colorScheme = useColorScheme();
  return colorScheme === "dark";
}
