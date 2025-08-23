import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { View, Text, Platform, ScrollView } from "react-native";

import { useThemeContext } from "../../ThemeContext";

export default function About() {
  const { colors } = useTheme();
  const { theme } = useThemeContext();
  const [tapToPayEnabled, setTapToPayEnabled] = useState(false);
  const version = Constants.expoConfig?.version || "1.0.0";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    "1";
  const appName = Constants.expoConfig?.name || "HCB Mobile";
  const appId =
    Constants.expoConfig?.ios?.bundleIdentifier ||
    Constants.expoConfig?.android?.package ||
    "";
  const apiBase = process.env.EXPO_PUBLIC_API_BASE || "N/A";
  const deviceModel = Constants.deviceName || "Unknown";
  const os = Platform.OS;
  const osVersion = Platform.Version;

  const debugRows = [
    { label: "App Name", value: appName },
    { label: "Version", value: `${version} (Build ${buildNumber})` },
    { label: "App ID", value: appId },
    { label: "Device", value: deviceModel },
    { label: "OS", value: `${os} ${osVersion}` },
    { label: "Theme", value: theme },
    { label: "API Base", value: apiBase },
  ];

  useEffect(() => {
    (async () => {
      const isTapToPayEnabled = await AsyncStorage.getItem("isTapToPayEnabled");
      setTapToPayEnabled(isTapToPayEnabled === "true");
    })();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Icon glyph="card" size={48} color={colors.primary} />
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "bold",
              marginVertical: 8,
            }}
          >
            HCB
          </Text>
          <Text style={{ color: colors.text, fontSize: 16, opacity: 0.7 }}>
            Version {version} (Build {buildNumber})
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {debugRows.map((row, idx) => (
            <View
              key={row.label}
              style={{
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 18,
                marginTop: idx === 0 ? 0 : 0,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                shadowColor: colors.text + "22",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  opacity: 0.7,
                  color: colors.text,
                }}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "400",
                  textAlign: "right",
                  flexShrink: 1,
                  marginLeft: 16,
                  opacity: 0.95,
                  color: colors.text,
                }}
              >
                {row.value}
              </Text>
            </View>
          ))}
          {/* Tap to Pay Enabled Row */}
          <View
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              shadowColor: colors.text + "22",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                opacity: 0.7,
                color: colors.text,
              }}
            >
              Tap to Pay
            </Text>
            {tapToPayEnabled ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  Enabled
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.text, opacity: 0.6, fontSize: 15 }}>
                Not Available
              </Text>
            )}
          </View>
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            marginTop: 32,
            textAlign: "center",
            opacity: 0.5,
          }}
        >
          © {new Date().getFullYear()} Hack Club. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}
