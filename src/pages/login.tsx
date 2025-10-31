import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  DiscoveryDocument,
} from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { ImageBackground, Image } from "expo-image";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { useContext, useEffect, useRef, useState } from "react";
import { Text, View, Animated, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AuthContext from "../auth/auth";
import Button from "../components/Button";
import { useIsDark } from "../lib/useColorScheme";
import { palette } from "../styles/theme";

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
      });
    } catch (error) {
      console.error("Error opening browser:", error);
      // Fallback to external browser if in-app browser fails
      Linking.openURL(url);
    }
  };

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#252429" : "#F6F6F6");
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

        <View
          style={{
            flexDirection: "column",
            gap: 12,
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <Animated.View
            style={[
              {
                opacity: animation,
                alignSelf: "flex-start",
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
            <Image
              source={
                isDark
                  ? require("../../assets/icon.png")
                  : require("../../assets/icon-light.png")
              }
              style={{ width: 80, height: 80 }}
            />
          </Animated.View>

          <Text
            style={{
              color: isDark ? "#FFFFFF" : "#17171E",
              textAlign: "center",
              fontSize: 36,
              fontWeight: "bold",
              fontFamily: "sans-serif",
              alignSelf: "flex-start",
            }}
          >
            Welcome to <Text style={{ color: palette.primary }}>HCB</Text>.
          </Text>
          <Text
            style={{
              color: isDark ? palette.muted : "#3C4858",
              textAlign: "left",
              fontSize: 16,
              fontFamily: "sans-serif",
              lineHeight: 22,
            }}
          >
            Over 5,000 nonprofit projects use HCB to raise money and manage
            their finances.
          </Text>

          <Button
            variant="ghost"
            onPress={() =>
              openInAppBrowser("https://hackclub.com/fiscal-sponsorship/")
            }
            style={{
              borderWidth: 0,
              paddingVertical: 8,
              paddingHorizontal: 0,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                color: isDark ? "#FFFFFF" : "#17171E",
                fontSize: 16,
                fontWeight: "bold",
                fontFamily: "sans-serif",
              }}
            >
              What's HCB? →
            </Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => promptAsync()}
            loading={loading}
          >
            Log in
          </Button>
          <Button
            variant="primary"
            onPress={() =>
              openInAppBrowser(
                "https://hcb.hackclub.com/users/auth?signup=true",
              )
            }
            loading={loading}
            style={{
              backgroundColor: palette.primary,
              borderWidth: 0,
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 20,
            }}
          >
            Sign up
          </Button>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
