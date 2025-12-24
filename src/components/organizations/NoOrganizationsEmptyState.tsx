import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { View, Text, ScrollView, Platform } from "react-native";
import { useSWRConfig } from "swr";

import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";
import Button from "../Button";

export const NoOrganizationsEmptyState = () => {
  const { colors: themeColors } = useTheme();
  const { mutate } = useSWRConfig();
  const isDark = useIsDark();

  const handleApply = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://hackclub.com/hcb/apply", {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,
        controlsColor: palette.primary,
        dismissButtonStyle: "cancel",
      });
      mutate("user/organizations");
      mutate("user/invitations");
    } catch (error) {
      console.error("Error opening application form:", error);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          paddingTop: 60,
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark
              ? "rgba(236, 55, 80, 0.1)"
              : "rgba(236, 55, 80, 0.08)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            ...(Platform.OS === "ios" && {
              shadowColor: palette.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            }),
          }}
        >
          <Ionicons name="rocket-outline" size={48} color={palette.primary} />
        </View>
        <Text
          style={{
            color: themeColors.text,
            fontSize: 26,
            fontWeight: "800",
            marginBottom: 12,
            textAlign: "center",
            letterSpacing: -0.5,
          }}
        >
          Welcome to HCB
        </Text>
        <Text
          style={{
            color: isDark ? "#7a8494" : palette.muted,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 32,
            lineHeight: 24,
            paddingHorizontal: 20,
          }}
        >
          You aren't a part of an organization yet.{"\n"}Looking to start one?
        </Text>
        <Button variant="primary" icon="enter" onPress={handleApply}>
          Apply to HCB
        </Button>
      </View>
    </ScrollView>
  );
};
