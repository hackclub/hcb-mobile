
import Icon from "@thedev132/hackclub-icons-rn";
import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  DiscoveryDocument,
} from "expo-auth-session";
import * as Haptics from "expo-haptics";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Animated,
  SafeAreaView,
  useColorScheme,
  ImageBackground,
  StyleSheet,
  Pressable,
} from "react-native";

import AuthContext from "../auth/auth";
import Button from "../components/Button";
import { logCriticalError } from "../lib/errorUtils";
import { useIsDark } from "../lib/useColorScheme";
import { lightTheme, palette, theme as darkTheme } from "../styles/theme";

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
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync("#000000");
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
          logCriticalError("Error exchanging code for token", error, {
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

  const handleWhatsHCB = async () => {
    await WebBrowser.openBrowserAsync(
      "https://hackclub.com/fiscal-sponsorship/",
    );
  };

  const handleSignUp = async () => {
    await WebBrowser.openBrowserAsync(
      "https://hcb.hackclub.com/users/auth?signup=true",
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backgroundImage: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingBottom: 50,
    },
    iconContainer: {
      width: 80,
      height: 80,
      backgroundColor: palette.primary,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    icon: {
      width: 48,
      height: 48,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 12,
    },
    highlightText: {
      color: palette.primary,
    },
    descriptionText: {
      fontSize: 16,
      color: "#FFFFFF",
      opacity: 0.9,
      marginBottom: 20,
      lineHeight: 22,
    },
    whatsHCBContainer: {
      marginBottom: 24,
    },
    whatsHCBText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    buttonContainer: {
      gap: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={
          isDark
            ? require("../../assets/banner-dark.png")
            : require("../../assets/banner-light.png")
        }
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            <Animated.View
              style={{
                opacity: animation,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.iconContainer}>
                <Icon glyph="bank-account" size={48} color="#FFFFFF" />
              </View>

              <Text style={styles.welcomeText}>
                Welcome to <Text style={styles.highlightText}>HCB</Text>.
              </Text>

              <Text style={styles.descriptionText}>
                Over 5,000 nonprofit projects use HCB to raise money and manage
                their finances.
              </Text>

              <Pressable
                style={styles.whatsHCBContainer}
                onPress={handleWhatsHCB}
              >
                <Text style={styles.whatsHCBText}>What's HCB? →</Text>
              </Pressable>

              <View style={styles.buttonContainer}>
                <Button
                  onPress={() => promptAsync()}
                  loading={loading}
                  variant="outline"
                  color="#FFFFFF"
                >
                  Log in
                </Button>

                <Button onPress={handleSignUp} variant="primary">
                  Sign up
                </Button>
              </View>
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
