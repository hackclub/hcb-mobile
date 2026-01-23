import { Ionicons } from "@expo/vector-icons";
import Intercom from "@intercom/intercom-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Sentry from "@sentry/react-native";
import { SendFeedbackParams } from "@sentry/react-native";
import { supportsAlternateIcons } from "expo-alternate-app-icons";
import { revokeAsync, type DiscoveryDocument } from "expo-auth-session";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as LocalAuthentication from "expo-local-authentication";
import * as StoreReview from "expo-store-review";
import * as SystemUI from "expo-system-ui";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Linking,
  Text,
  View,
  Pressable,
  ScrollView,
  Animated,
  useColorScheme as useSystemColorScheme,
  Platform,
  Switch,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import { mutate } from "swr";

import AuthContext from "../../auth/auth";
import Button from "../../components/Button";
import FeedbackModal from "../../components/FeedbackModal";
import { useDevTools } from "../../lib/devtools";
import { SettingsStackParamList } from "../../lib/NavigatorParamList";
import User from "../../lib/types/User";
import { useIsDark } from "../../lib/useColorScheme";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { useCache } from "../../providers/cacheProvider";
import { useThemeContext } from "../../providers/ThemeContext";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";

const PRIVACY_URL = "https://hack.club/hcb-privacy-policy";

const THEME_KEY = "app_theme";
const BIOMETRICS_KEY = "biometrics_required";

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};

const themeOptions = [
  {
    key: "light",
    label: "Light",
    icon: "sunny" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "system",
    label: "System",
    icon: "phone-portrait" as keyof typeof Ionicons.glyphMap,
  },
  {
    key: "dark",
    label: "Dark",
    icon: "moon" as keyof typeof Ionicons.glyphMap,
  },
];

function isTapToPaySupported() {
  if (Constants.platform?.ios && Device.osVersion) {
    return parseInt(Device.osVersion, 10) >= 17;
  }
  return false;
}

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsMain">;

export default function SettingsPage({ navigation }: Props) {
  const { tokenResponse, setTokenResponse } = useContext(AuthContext);
  const { data: user } = useOfflineSWR<User>("user");
  const { data: token } = useOfflineSWR<string>("user/intercom_token");
  const { colors } = useTheme();
  const cache = useCache();
  const { theme, setTheme, resetTheme } = useThemeContext();
  const animation = useRef(new Animated.Value(0)).current;
  const deviceColorScheme = useSystemColorScheme();
  const isDark = useIsDark();
  const [biometricsRequired, setBiometricsRequired] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [storeReviewAvailable, setStoreReviewAvailable] = useState(false);

  useEffect(() => {
    Intercom.setUserJwt(token ?? "");
  }, [token]);

  useEffect(() => {
    (async () => {
      const available = await StoreReview.isAvailableAsync();
      setStoreReviewAvailable(available);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storedBiometrics = await AsyncStorage.getItem(BIOMETRICS_KEY);
      setBiometricsRequired(storedBiometrics === "true");

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && isEnrolled);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "system"
        ) {
          setTheme(storedTheme);
        }
      } catch (error) {
        console.error("Error loading settings", error, {
          context: { action: "settings_load" },
        });
      }
    })();
  }, [setTheme]);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  useEffect(() => {
    if (Platform.OS === "android" && theme === "system") {
      (async () => {
        try {
          const shouldBeDark = deviceColorScheme === "dark";
          console.log("System theme update:", {
            theme,
            deviceColorScheme,
            shouldBeDark,
          });
          await SystemUI.setBackgroundColorAsync(
            shouldBeDark ? "#252429" : "white",
          );
        } catch (error) {
          console.error("Error setting system UI background color", error, {
            context: { theme, deviceColorScheme },
          });
        }
      })();
    }
  }, [theme, deviceColorScheme]);

  useFocusEffect(
    useCallback(() => {
      mutate("user");
    }, []),
  );

  const handleThemeChange = async (value: "light" | "dark" | "system") => {
    Haptics.selectionAsync();
    setTheme(value);

    if (Platform.OS === "android") {
      try {
        const currentDeviceTheme = deviceColorScheme ?? "light";
        const shouldBeDark =
          value === "dark" ||
          (value === "system" && currentDeviceTheme === "dark");

        console.log("Theme change:", {
          value,
          deviceColorScheme,
          currentDeviceTheme,
          shouldBeDark,
        });

        await SystemUI.setBackgroundColorAsync(
          shouldBeDark ? "#252429" : "white",
        );
      } catch (error) {
        console.error("Error setting system UI background color", error, {
          context: { theme: value, deviceColorScheme },
        });
      }
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        console.log("Biometric authentication not available");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to change biometric settings",
        cancelLabel: "Cancel",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        console.log("Biometric authentication failed or cancelled");
        return;
      }

      Haptics.toggleAsync(value);
      setBiometricsRequired(value);
      await AsyncStorage.setItem(BIOMETRICS_KEY, value.toString());
    } catch (error) {
      console.error("Error saving biometrics setting", error, {
        context: { action: "biometrics_toggle", value },
      });
    }
  };

  const handleSignOut = async () => {
    resetTheme();
    try {
      if (tokenResponse?.refreshToken) {
        try {
          await revokeAsync(
            {
              clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
              token: tokenResponse.refreshToken,
            },
            discovery,
          );
        } catch (revokeError) {
          console.warn("Failed to revoke token during sign out", revokeError);
        }
      }

      await AsyncStorage.multiRemove([
        THEME_KEY,
        BIOMETRICS_KEY,
        "organizationOrder",
        "canceledCardsShown",
        "ttpDidOnboarding",
        "hasSeenTapToPayBanner",
        "cardOrder",
      ]);
      cache.clear();
      setTokenResponse(null);
    } catch (error) {
      console.error("Error clearing storage during sign out", error, {
        context: { action: "sign_out" },
      });
      cache.clear();
      setTokenResponse(null);
    }
  };

  const dividerColor = isDark ? palette.slate : colors.border;
  const showTutorials = isTapToPaySupported();

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      style={{ backgroundColor: colors.background }}
    >
      <View style={{ padding: 20 }}>
        {/* Profile Card */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 18,
            padding: 18,
            marginBottom: 12,
          }}
        >
          <Animated.Image
            source={{ uri: user?.avatar }}
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              marginRight: 16,
              opacity: animation,
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          />
          <View>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 20,
                color: colors.text,
                marginBottom: 2,
              }}
            >
              {user?.name || " "}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15 }}>
              {user?.email || " "}
            </Text>
          </View>
        </View>

        {/* Theme Section */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 14,
            marginTop: 10,
          }}
        >
          Theme
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            padding: 18,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.card,
              borderRadius: 16,
              overflow: "hidden",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {themeOptions.map((opt, idx) => (
              <Pressable
                key={opt.key}
                style={[
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    backgroundColor: "transparent",
                  },
                  theme === opt.key && {
                    backgroundColor: colors.primary,
                    borderRadius: 16,
                  },
                  idx === 1 && { marginHorizontal: 2 },
                ]}
                onPress={() =>
                  handleThemeChange(opt.key as "light" | "dark" | "system")
                }
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={theme === opt.key ? "#fff" : palette.muted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: theme === opt.key ? "#fff" : palette.muted,
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* App Settings Section */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 14,
            marginTop: 10,
          }}
        >
          App Settings
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          {biometricsAvailable && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 18,
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Ionicons
                    name="finger-print"
                    size={22}
                    color={palette.muted}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>
                      Require Biometrics
                    </Text>
                    <Text
                      style={{
                        color: palette.muted,
                        fontSize: 14,
                        marginTop: 2,
                      }}
                    >
                      Use Face ID or Touch ID to unlock the app
                    </Text>
                  </View>
                </View>
                <Switch
                  style={{ marginRight: 12 }}
                  value={biometricsRequired}
                  onValueChange={handleBiometricsToggle}
                  trackColor={{ false: palette.muted, true: colors.primary }}
                  thumbColor={biometricsRequired ? "#fff" : "#f4f3f4"}
                />
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginLeft: 20,
                  marginRight: 20,
                }}
              />
            </>
          )}
          {supportsAlternateIcons && Platform.OS != "android" && (
            <>
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 18,
                }}
                onPress={() => navigation.navigate("AppIconSelector")}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={22}
                  color={palette.muted}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ color: colors.text, fontSize: 16 }}>
                  Change App Icon
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={palette.muted}
                  style={{ marginLeft: "auto" }}
                />
              </Pressable>
              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginLeft: 20,
                  marginRight: 20,
                }}
              />
            </>
          )}

          <Pressable
            style={{ flexDirection: "row", alignItems: "center", padding: 18 }}
            onPress={() => navigation.navigate("DeepLinkingSettings")}
          >
            <Ionicons
              name="link"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              Deep Linking
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>

          {showTutorials && (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginLeft: 20,
                  marginRight: 20,
                }}
              />
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 18,
                }}
                onPress={() => navigation.navigate("Tutorials")}
              >
                <Ionicons
                  name="book-outline"
                  size={22}
                  color={palette.muted}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ color: colors.text, fontSize: 16 }}>
                  Tutorials
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={palette.muted}
                  style={{ marginLeft: "auto" }}
                />
              </Pressable>
            </>
          )}
        </View>

        {/* Support & Feedback Section */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 14,
            marginTop: 10,
          }}
        >
          Support & Feedback
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingVertical: 0,
            paddingHorizontal: 0,
            marginBottom: 24,
          }}
        >
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 18,
            }}
            onPress={async () => {
              if (user) {
                Intercom.loginUserWithUserAttributes({
                  email: user?.email,
                  userId: user?.id,
                });
                Intercom.updateUser({
                  email: user?.email,
                  userId: user?.id,
                  name: user?.name,
                });
              } else {
                Intercom.loginUnidentifiedUser();
              }
              Intercom.present();
            }}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              Contact Support
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>
          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginLeft: 20,
              marginRight: 20,
            }}
          />
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 18,
            }}
            onPress={() => setFeedbackModalVisible(true)}
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>Feedback</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>
          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginLeft: 20,
              marginRight: 20,
            }}
          />
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 18,
            }}
            onPress={async () => {
              const storeUrl = StoreReview.storeUrl();
              if (storeUrl) {
                Linking.openURL(storeUrl);
              } else if (storeReviewAvailable) {
                try {
                  await StoreReview.requestReview();
                } catch (error) {
                  console.error("Error requesting store review", error);
                }
              }
            }}
          >
            <Ionicons
              name="star-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>Rate Us</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>
        </View>

        {/* Legal & Info Section */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 14,
            marginTop: 10,
          }}
        >
          Legal & Info
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingVertical: 0,
            paddingHorizontal: 0,
            marginBottom: 24,
          }}
        >
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 18,
            }}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            <Ionicons
              name="shield-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              Privacy Policy
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>
          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginLeft: 20,
              marginRight: 20,
            }}
          />
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 18,
            }}
            onPress={() => navigation.navigate("About")}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              Info / About
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.muted}
              style={{ marginLeft: "auto" }}
            />
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Button
          style={{
            marginTop: 12,
            marginBottom: 32,
            backgroundColor: colors.primary,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
          }}
          onPress={() => handleSignOut()}
        >
          Sign Out
        </Button>

        {__DEV__ && <DevToolsButton colors={colors} />}
      </View>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={(feedback) => {
          try {
            Sentry.captureFeedback(
              {
                message: feedback.message,
              } as SendFeedbackParams,
              {
                captureContext: {
                  tags: {
                    category: feedback.category,
                  },
                },
              },
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
              type: ALERT_TYPE.SUCCESS,
              title: "Feedback submitted!",
              textBody: "Thank you for your feedback!",
            });
          } catch (error) {
            console.error("Failed to submit feedback:", error);
            Toast.show({
              type: ALERT_TYPE.DANGER,
              title: "Failed to submit feedback",
              textBody: "Please try again later.",
            });
          }
        }}
      />
    </ScrollView>
  );
}

function DevToolsButton({ colors }: { colors: { primary: string; card: string; text: string } }) {
  const { forceOpen } = useDevTools();

  return (
    <Pressable
      style={{
        marginBottom: 40,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ff8c37",
        borderStyle: "dashed",
      }}
      onPress={forceOpen}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="bug" size={20} color="#ff8c37" />
        <Text style={{ color: "#ff8c37", fontWeight: "600", fontSize: 16 }}>
          Open Dev Tools
        </Text>
      </View>
    </Pressable>
  );
}
