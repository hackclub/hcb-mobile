import Icon from "@thedev132/hackclub-icons-rn";
import Constants from "expo-constants";
import { useTheme } from "expo-router/react-navigation";
import * as Updates from "expo-updates";
import { Platform, ScrollView, View } from "react-native";

import { Text } from "@/components/Text";
import { useThemeContext } from "@/lib/providers/ThemeContext";
import { useIsDark } from "@/lib/useColorScheme";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { palette } from "@/styles/theme";

export default function About() {
  const { colors } = useTheme();
  const { theme } = useThemeContext();
  const isDark = useIsDark();
  const headerInset = useHeaderInset();
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
  const updateId = Updates.updateId;

  const sections = [
    {
      title: "App Information",
      rows: [
        { label: "App Name", value: appName },
        { label: "Version", value: `${version} (Build ${buildNumber})` },
        { label: "Update ID", value: updateId || "Embedded Update" },
        { label: "App ID", value: appId },
      ],
    },
    {
      title: "Device Information",
      rows: [
        { label: "Device", value: deviceModel },
        { label: "OS", value: `${os} ${osVersion}` },
      ],
    },
    {
      title: "Configuration",
      rows: [
        { label: "Theme", value: theme },
        { label: "API Base", value: apiBase },
      ],
    },
  ];

  const renderRow = (
    row: { label: string; value: string },
    isFirst: boolean,
  ) => (
    <View
      key={row.label}
      style={{
        paddingVertical: 16,
        marginHorizontal: 18,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: isDark ? palette.slate : colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "500",
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
          opacity: 0.7,
          color: colors.text,
        }}
      >
        {row.value}
      </Text>
    </View>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 80, paddingTop: headerInset }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Icon glyph="card" size={48} color={colors.primary as string} />
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

        <View style={{ gap: 24 }}>
          {sections.map((section) => (
            <View key={section.title}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.text,
                  opacity: 0.6,
                  marginBottom: 8,
                  marginLeft: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  shadowColor: (colors.text as string) + "22",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                  overflow: "hidden",
                }}
              >
                {section.rows.map((row, idx) => renderRow(row, idx === 0))}
              </View>
            </View>
          ))}
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
          © {new Date().getFullYear()} Hack Club. All rights reserved
        </Text>
      </View>
    </ScrollView>
  );
}
