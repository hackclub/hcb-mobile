import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useContext, useEffect, useRef } from "react";
import {
  Linking,
  Text,
  View,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import useSWR from "swr";

import AuthContext from "../../auth";
import { useCache } from "../../cacheProvider";
import Button from "../../components/Button";
import { SettingsStackParamList } from "../../lib/NavigatorParamList";
import User from "../../lib/types/User";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../theme";
import { useThemeContext } from "../../ThemeContext";

const TOS_URL = "https://hcb.hackclub.com/tos";

const THEME_KEY = "app_theme";

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
  const { setTokens } = useContext(AuthContext);
  const { data: user } = useSWR<User>("user");
  const { colors } = useTheme();
  const cache = useCache();
  const { theme, setTheme, resetTheme } = useThemeContext();
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (
        storedTheme === "light" ||
        storedTheme === "dark" ||
        storedTheme === "system"
      ) {
        setTheme(storedTheme);
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

  const handleThemeChange = async (value: "light" | "dark" | "system") => {
    setTheme(value);
  };

  const handleSignOut = async () => {
    resetTheme();
    await AsyncStorage.multiRemove([
      THEME_KEY,
      "organizationOrder",
      "canceledCardsShown",
      "ttpDidOnboarding",
      "hasSeenTapToPayBanner",
      "cardOrder",
    ]);
    cache.clear();
    setTokens(null);
  };

  const isDark = useIsDark();
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

        {/* App Icon & Tutorials Section */}
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
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", padding: 18 }}
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
              Deep linking
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
            onPress={() => Linking.openURL(TOS_URL)}
          >
            <Ionicons
              name="document-text-outline"
              size={22}
              color={palette.muted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              Terms & Conditions
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
      </View>
    </ScrollView>
  );
}
