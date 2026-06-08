import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import * as WebBrowser from "expo-web-browser";
import { Platform, ScrollView, View } from "react-native";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

export const NoOrganizationsEmptyState = () => {
  const { colors: themeColors } = useTheme();
  const { mutate } = useSWRConfig();
  const isDark = useIsDark();

  const handleApply = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://nonprofit.new", {
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
        <Button variant="green" icon="plus" iconSize={24} iconPosition="left" onPress={handleApply}>
          New Organization
        </Button>
      </View>
    </ScrollView>
  );
};
