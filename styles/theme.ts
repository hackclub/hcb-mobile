import { DarkTheme, DefaultTheme, Theme } from "expo-router/react-navigation";

export const palette = {
  primary: "#ec3750",
  background: "#17171d",
  muted: "#8492a6",
  slate: "#3c4858",
  darkless: "#252429",
  smoke: "#e0e6ed",
  info: "#338eda",
  success: "#33d6a6",
  warning: "#ff8c37",
  black: "#1f2d3d",
  // Full HCB color set
  dark: "#151413",
  darker: "#0f0e0e",
  darkless2: "#252429",
  snow: "#f9fafc",
  red: "#ec3750",
  orange: "#ff8c37",
  yellow: "#f1c40f",
  green: "#33d6a6",
  cyan: "#5bc0de",
  blue: "#338eda",
  purple: "#a633d6",
};

/** Standard card/section border color — use everywhere a bordered card appears */
export function cardBorderColor(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
}

/** Secondary/muted text color for labels, placeholders, metadata */
export function subTextColor(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
}

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 18,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  eyebrow: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.8, textTransform: "uppercase" as const },
  mono: { fontFamily: "JetBrainsMono-Regular", fontSize: 14 },
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
