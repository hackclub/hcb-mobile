import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

export const palette = {
  primary: "#ec3750",
  background: "#17171d",
  muted: "#8492a6",
  slate: "#3c4858",
  darkless: "#252429",
  smoke: "#e0e6ed",
  info: "#338eda",
  success: "#33d6a6",
};

export const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.background,
    card: palette.darkless,
    text: palette.smoke,
    primary: palette.primary,
    notification: palette.primary,
  },
};

export const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    text: "#1f2d3d",
    card: "#fff",
    primary: palette.primary,
    notification: palette.primary,
  },
};
