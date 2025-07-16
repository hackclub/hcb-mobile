import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { logError } from "./lib/errorUtils";

export type ThemeType = "light" | "dark" | "system";

const THEME_KEY = "app_theme";

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "system",
  setTheme: () => {},
  resetTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>("system");

  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "system"
        ) {
          setThemeState(storedTheme);
        }
      } catch (error) {
        logError("Error loading theme from storage", error, {
          context: { action: "theme_load" },
        });
        // Default to system theme on error
        setThemeState("system");
      }
    })();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      logError("Error saving theme to storage", error, {
        context: { newTheme },
      });
    }
  };

  const resetTheme = async () => {
    setThemeState("system");
    try {
      await AsyncStorage.setItem(THEME_KEY, "system");
    } catch (error) {
      logError("Error resetting theme in storage", error, {
        context: { action: "theme_reset" },
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
