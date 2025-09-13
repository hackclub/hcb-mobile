import "expo-dev-client";

import * as Sentry from "@sentry/react-native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";

import AppContent from "./src/AppContent";
import { AuthProvider } from "./src/AuthProvider";
import { useCache } from "./src/cacheProvider";
import { ThemeProvider } from "./src/ThemeContext";
import { StripeProvider } from "@stripe/stripe-react-native";

function App() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Regular": require("./assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Bold": require("./assets/fonts/JetBrainsMono-Bold.ttf"),
    "Consolas-Bold": require("./assets/fonts/CONSOLAB.ttf"),
    Damion: require("./assets/fonts/Damion-Regular.ttf"),
  });

  console.log("process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", process.env.EXPO_PUBLIC_STRIPE_API_KEY);

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
  <StripeProvider publishableKey={"pk_live_UAjIP1Kss29XZ6tW0MFWkjUQ"} merchantIdentifier="merchant.com.hackclub.hcb">
    <ThemeProvider>
      <AuthProvider>
        <AppContent scheme={scheme} cache={cache} />
      </AuthProvider>
    </ThemeProvider>
    </StripeProvider>
  );
}

export default Sentry.wrap(App);
