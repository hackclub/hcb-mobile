import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSWRConfig } from "swr";

import { palette } from "../../styles/theme";

export const NoOrganizationsEmptyState = () => {
  const { colors: themeColors } = useTheme();
  const { mutate } = useSWRConfig();

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
      style={[
        styles.outerContainer,
        { backgroundColor: themeColors.background },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="rocket-outline"
            size={64}
            color={palette.primary}
            style={styles.icon}
          />
        </View>
        <Text style={[styles.title, { color: themeColors.text }]}>
          Welcome to HCB
        </Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          You aren't a part of an organization yet, looking to start one?
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.primary }]}
          onPress={handleApply}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Apply to HCB</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 40,
    minWidth: 200,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  featuresContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 24,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
});
