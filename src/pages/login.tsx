import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  DiscoveryDocument,
} from "expo-auth-session";
import { ImageBackground, Image } from "expo-image";
import * as Linking from "expo-linking";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { useContext, useEffect, useRef, useState } from "react";
import { Text, View, Animated, useColorScheme, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AuthContext from "../auth/auth";
import Button from "../components/Button";
import { useIsDark } from "../lib/useColorScheme";
import { palette } from "../styles/theme";
import * as Haptics from "../utils/haptics";

export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};
const clientId = process.env.EXPO_PUBLIC_CLIENT_ID!;

const redirectUri = makeRedirectUri({ scheme: "hcb" });

export default function Login() {
  const scheme = useColorScheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const processedResponseRef = useRef<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<boolean | null>(null);

  const signupParam = pendingSignup ?? false;

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ["read", "write"],
      usePKCE: true,
      responseType: "code",
      extraParams: {
        no_app_shell: "true",
        theme: scheme || "",
        signup: signupParam.toString(),
      },
    },
    discovery,
  );

  const [loading, setLoading] = useState(false);

  const { setTokens } = useContext(AuthContext);
  const isDark = useIsDark();

  const openInAppBrowser = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: palette.primary,
        showTitle: true,
        enableBarCollapsing: false,
        showInRecents: false,
        createTask: false,
      });
    } catch (error) {
      console.error("Error opening browser:", error);
      // Fallback to external browser if in-app browser fails
      Linking.openURL(url);
    }
  };

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#16161E" : "#F6F6F6");
    };
    setStatusBar();
    if (!response || isProcessing) return;

    const responseKey =
      response.type +
      (response.type === "success" ? response.params?.code : "");
    if (processedResponseRef.current === responseKey) return;

    if (response.type === "success") {
      processedResponseRef.current = responseKey;
      setIsProcessing(true);
      setLoading(true);
      exchangeCodeAsync(
        {
          clientId,
          redirectUri,
          code: response.params.code,
          extraParams: { code_verifier: request!.codeVerifier! },
        },
        discovery,
      )
        .then(async (r) => {
          console.log("Token exchange successful");

          if (!r.refreshToken) {
            console.warn("No refresh token received from authorization server");
          }

          const expiresAt = Date.now() + (r.expiresIn || 7200) * 1000;

          const tokens = {
            accessToken: r.accessToken,
            refreshToken: r.refreshToken || "",
            expiresAt,
            createdAt: Date.now(),
            codeVerifier: request?.codeVerifier,
          };

          setTokens(tokens);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setLoading(false);
          setIsProcessing(false);
          processedResponseRef.current = null;
        })
        .catch((error) => {
          console.error("Error exchanging code for token", error, {
            authCode: request?.codeChallenge,
          });
          setLoading(false);
          setIsProcessing(false);
          processedResponseRef.current = null;
        });
    }

    return () => {
      if (response.type === "success") {
        processedResponseRef.current = responseKey;
      }
    };
  }, [response, request, setTokens, isProcessing, isDark]);

  const doPrompt = async () => {
    if (isPrompting) return;
    setIsPrompting(true);
    try {
      await promptAsync({ createTask: false });
    } finally {
      setIsPrompting(false);
      setPendingSignup(null);
    }
  };

  useEffect(() => {
    if (
      pendingSignup !== null &&
      request?.extraParams?.signup === pendingSignup.toString()
    ) {
      doPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSignup, request]);

  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  return (
    <ImageBackground
      source={
        isDark
          ? require("../../assets/login-bg.png")
          : require("../../assets/login-bg-light.png")
      }
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, flexDirection: "column" }}>
        <View
          style={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        ></View>

        {/* Main content */}
        <View
          style={{
            flexDirection: "column",
            gap: 16,
            paddingHorizontal: 24,
            paddingBottom: Platform.OS === "android" ? 20 : 8,
          }}
        >
          {/* Logo */}
          <Animated.View
            style={[
              {
                opacity: animation,
                alignSelf: "flex-start",
                marginBottom: 8,
                transform: [
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={{
                borderRadius: 20,
                overflow: "hidden",
                ...(Platform.OS === "ios" && {
                  shadowColor: palette.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                }),
              }}
            >
              <Image
                source={
                  isDark
                    ? require("../../assets/icon.png")
                    : require("../../assets/icon-light.png")
                }
                style={{ width: 72, height: 72 }}
              />
            </View>
          </Animated.View>

          {/* Welcome text */}
          <View>
            <Text
              style={{
                color: isDark ? "#FFFFFF" : "#17171E",
                fontSize: 34,
                fontWeight: "800",
                letterSpacing: -1,
                marginBottom: 8,
              }}
            >
              Welcome to <Text style={{ color: palette.primary }}>HCB</Text>.
            </Text>
            <Text
              style={{
                color: isDark ? "#8b95a5" : "#52606d",
                fontSize: 17,
                lineHeight: 24,
                letterSpacing: -0.2,
              }}
            >
              can Over 5,000 nonprofit projects use HCB to raise money and
              manage their finances.
            </Text>
          </View>

          <Button
            variant="ghost"
            onPress={() =>
              openInAppBrowser("https://hackclub.com/fiscal-sponsorship/")
            }
            style={{
              paddingVertical: 8,
              paddingHorizontal: 0,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: palette.primary,
                fontSize: 16,
                fontWeight: "600",
                letterSpacing: -0.2,
              }}
            >
              What's HCB? →
            </Text>
          </Button>

          <View style={{ gap: 12, marginTop: 8 }}>
            <Button variant="primary" onPress={() => setPendingSignup(true)}>
              Get Started
            </Button>
            <Button
              variant="outline"
              onPress={() => setPendingSignup(false)}
              loading={loading}
            >
              Log In
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
