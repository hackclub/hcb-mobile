import "expo-dev-client";

import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { ShareIntentProvider as ExpoShareIntentProvider } from "expo-share-intent";
import { useColorScheme } from "react-native";

import AppContent from "./src/AppContent";
import { AuthProvider } from "./src/AuthProvider";
import { useCache } from "./src/cacheProvider";
import { CustomAlertProvider } from "./src/components/alert/CustomAlertProvider";
import { LinkingProvider } from "./src/LinkingContext";
import { ShareIntentProvider } from "./src/ShareIntentContext";
import { ThemeProvider } from "./src/ThemeContext";

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  const scheme = useColorScheme();
  const cache = useCache();

  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: false,
      integrations: [
        Sentry.reactNativeTracingIntegration(),
        Sentry.reactNativeErrorHandlersIntegration(),
      ],
      sendDefaultPii: true,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ExpoShareIntentProvider>
      <ThemeProvider>
        <AuthProvider>
          <ShareIntentProvider>
            <LinkingProvider>
              <CustomAlertProvider>
                <AppContent scheme={scheme} cache={cache} />
              </CustomAlertProvider>
            </LinkingProvider>
          </ShareIntentProvider>
        </AuthProvider>
      </ThemeProvider>
    </ExpoShareIntentProvider>
  );
}

export default Sentry.wrap(App);
