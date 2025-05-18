import "expo-dev-client";

import * as Sentry from "@sentry/react-native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";

import AppContent from "./src/AppContent";
import { AuthProvider } from "./src/AuthProvider";
import { useCache } from "./src/cacheProvider";

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  const scheme = useColorScheme();
  const cache = useCache();
  useStripeTerminal();

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    debug: false,
    integrations: [Sentry.reactNativeTracingIntegration()],
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppContent scheme={scheme} cache={cache} />
    </AuthProvider>
  );
}

export default Sentry.wrap(App);
