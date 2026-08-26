import {
  DiscoveryDocument,
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { Image, ImageBackground } from "expo-image";
import * as Linking from "expo-linking";
import { ObserveInteractiveMarker } from "expo-observe";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import * as WebBrowser from "expo-web-browser";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import AuthContext from "@/lib/auth/auth";
import log from "@/lib/log";
import toast from "@/lib/toast";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};
const clientId = process.env.EXPO_PUBLIC_CLIENT_ID!;

const redirectUri = makeRedirectUri({ scheme: "hcb" });

WebBrowser.maybeCompleteAuthSession();

const browserOptions = {
  controlsColor: palette.primary,
  showTitle: true,
  enableBarCollapsing: false,
};

function isMissingBrowserError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return (
    code === "ERR_NO_MATCHING_ACTIVITY" ||
    code === "ERR_PACKAGE_MANAGER_NOT_FOUND" ||
    code === "PREFERRED_PACKAGE_NOT_FOUND"
  );
}

export default function Login() {
  const scheme = useColorScheme();
  const isDark = useIsDark();

  const [loading, setLoading] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<boolean | null>(null);
  const [busyButton, setBusyButton] = useState<"login" | "signup" | null>(null);

  // Prevent duplicate token exchanges
  const isProcessingRef = useRef(false);
  // Read synchronously so a re-render mid-prompt can't start a second session.
  const isPromptingRef = useRef(false);
  const processedCodesRef = useRef<Set<string>>(new Set());
  const codeVerifierRef = useRef<string | null>(null);

  const { setTokenResponse } = useContext(AuthContext);

  const signupParam = pendingSignup ?? false;

  const authConfig = useMemo(
    () => ({
      clientId,
      redirectUri,
      scopes: ["read", "write", "admin:read", "admin:write"],
      usePKCE: true,
      responseType: "code",
      extraParams: {
        no_app_shell: "true",
        theme: scheme || "",
        signup: signupParam.toString(),
      },
    }),
    [signupParam, scheme],
  );

  const [request, response, promptAsync] = useAuthRequest(
    authConfig,
    discovery,
  );

  const openInAppBrowser = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url, {
        ...browserOptions,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
    } catch (error) {
      log.exception(error, {
        context: "login.openInAppBrowser",
        feature: "auth",
      });
      // Fallback to external browser if in-app browser fails
      Linking.openURL(url);
    }
  };

  useEffect(() => {
    const setStatusBar = async () => {
      await SystemUI.setBackgroundColorAsync(isDark ? "#16161E" : "#F6F6F6");
    };
    setStatusBar();
  }, [isDark]);

  useEffect(() => {
    if (request?.codeVerifier) {
      codeVerifierRef.current = request.codeVerifier;
    }
  }, [request?.codeVerifier]);

  // Exchange the authorization code for tokens and persist them. Runs to
  // completion inside the caller's async closure even if the React tree
  // remounts on the OAuth redirect (which tears down effects but not a
  // running promise chain). Guarded so the same code is never exchanged twice.
  const exchangeAuthCode = useCallback(
    async (authCode: string, codeVerifier: string) => {
      if (isProcessingRef.current || processedCodesRef.current.has(authCode)) {
        return;
      }
      isProcessingRef.current = true;
      processedCodesRef.current.add(authCode);
      setLoading(true);

      try {
        const tokenResponse = await exchangeCodeAsync(
          {
            clientId,
            redirectUri,
            code: authCode,
            extraParams: { code_verifier: codeVerifier },
          },
          discovery,
        );
        await setTokenResponse(tokenResponse, codeVerifier);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        log.exception(error, {
          context: "login.exchangeCode",
          feature: "auth",
        });
        toast.error(
          "Couldn't finish signing in",
          "Something went wrong exchanging your login. Please try again.",
        );
        // Allow a retry of this code if the exchange failed.
        processedCodesRef.current.delete(authCode);
      } finally {
        setLoading(false);
        isProcessingRef.current = false;
      }
    },
    [setTokenResponse],
  );

  // Fallback path: if the browser redirect resolves via the `response` state
  // (component stayed mounted), exchange here. The primary path is doPrompt.
  useEffect(() => {
    if (response?.type !== "success") return;
    const authCode = response.params?.code;
    if (!authCode) return;
    const codeVerifier = codeVerifierRef.current || request?.codeVerifier;
    if (!codeVerifier) {
      log.error("No code verifier available for token exchange", {
        feature: "auth",
      });
      return;
    }
    exchangeAuthCode(authCode, codeVerifier);
  }, [response, request, exchangeAuthCode]);

  const doPrompt = useCallback(async () => {
    if (isPromptingRef.current) return;

    isPromptingRef.current = true;
    setIsPrompting(true);
    isProcessingRef.current = false;

    try {
      const _r = await promptAsync(browserOptions);
      // Primary path: exchange the code straight from the promptAsync result,
      // so it does not depend on the `response` effect surviving a remount.
      if (_r?.type === "success" && _r.params?.code) {
        const codeVerifier = codeVerifierRef.current || request?.codeVerifier;
        if (codeVerifier) {
          await exchangeAuthCode(_r.params.code, codeVerifier);
        } else {
          log.error("No code verifier available for token exchange", {
            feature: "auth",
          });
          toast.error(
            "Couldn't finish signing in",
            "Please try signing in again.",
          );
        }
      } else if (_r?.type === "error") {
        log.exception(_r.error ?? new Error("Auth session returned an error"), {
          context: "login.promptAsync",
          feature: "auth",
          attributes: { authError: _r.error?.code },
        });
        toast.error(
          "Sign in failed",
          _r.error?.description ?? "Please try again.",
        );
      } else if (_r?.type === "locked") {
        toast.info("Sign in already in progress");
      }
      // `cancel` and `dismiss` mean the user closed the browser themselves —
      // returning to this screen is the correct outcome, so stay quiet.
    } catch (error) {
      log.exception(error, { context: "login.promptAsync", feature: "auth" });
      toast.error(
        "Couldn't open the sign in page",
        isMissingBrowserError(error)
          ? "No web browser is available on this device. Enable Chrome or another browser and try again."
          : "Something went wrong opening the browser. Please try again.",
      );
    } finally {
      isPromptingRef.current = false;
      setIsPrompting(false);
      setPendingSignup(null);
      setBusyButton(null);
    }
  }, [promptAsync, request, exchangeAuthCode]);

  useEffect(() => {
    if (
      pendingSignup !== null &&
      request?.extraParams?.signup === pendingSignup.toString()
    ) {
      doPrompt();
    }
  }, [pendingSignup, request, doPrompt]);

  // `useAuthRequest` swallows a rejected `makeAuthUrlAsync`, leaving `request`
  // null forever — the gate above then never fires and the button spins with no
  // error anywhere. Give up after a few seconds and say so.
  useEffect(() => {
    if (!busyButton || isPrompting) return;

    const timer = setTimeout(() => {
      log.error("Auth request never became ready", {
        feature: "auth",
        hasRequest: !!request,
        hasAuthUrl: !!request?.url,
      });
      toast.error(
        "Couldn't start sign in",
        "Please check your connection and try again.",
      );
      setBusyButton(null);
      setPendingSignup(null);
    }, 8000);

    return () => clearTimeout(timer);
  }, [busyButton, isPrompting, request]);

  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
      <ObserveInteractiveMarker />
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
            gap: 16,
            paddingHorizontal: 24,
            paddingBottom: Platform.OS === "android" ? 20 : 8,
          }}
        >
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

          <View>
            <Text
              style={{
                color: isDark ? "#FFFFFF" : "#17171E",
                fontSize: 34,
                letterSpacing: -1,
                marginBottom: 8,
              }}
              bold
            >
              Welcome to{" "}
              <Text style={{ color: palette.primary, fontSize: 34 }} bold>
                HCB.
              </Text>
            </Text>
            <Text
              style={{
                color: isDark ? "#8b95a5" : "#52606d",
                fontSize: 20,
                lineHeight: 27,
                letterSpacing: -0.2,
              }}
            >
              Over 5,000 nonprofit projects use HCB to raise money and manage
              their finances.
            </Text>
          </View>

          <Button
            variant="ghost"
            onPress={() =>
              openInAppBrowser("https://hackclub.com/fiscal-sponsorship/")
            }
            style={{
              marginTop: -10,
              paddingBottom: 8,
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
            <Button
              variant="primary"
              onPress={() => {
                setBusyButton("signup");
                setPendingSignup(true);
              }}
              loading={busyButton === "signup"}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setBusyButton("login");
                setPendingSignup(false);
              }}
              loading={loading || busyButton === "login"}
            >
              Log In
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
