import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

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
      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (
        storedTheme === "light" ||
        storedTheme === "dark" ||
        storedTheme === "system"
      ) {
        setThemeState(storedTheme);
      }
    })();
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  const resetTheme = () => {
    setThemeState("system");
    AsyncStorage.setItem(THEME_KEY, "system");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
