import { useTheme } from "@react-navigation/native";
import { Switch, View, Text, ActivityIndicator } from "react-native";

import { useLinkingPref } from "../../providers/LinkingContext";
import { palette } from "../../styles/theme";

export default function DeepLinkingSettings() {
  const { enabled, setEnabled } = useLinkingPref();
  const { colors } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background, padding: 32 }}>
      <View style={{ width: "100%" }}>
        <View
          style={{
            width: "100%",
            backgroundColor: colors.card,
            padding: 20,
            borderRadius: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 6.0,
            elevation: 6,
            marginVertical: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: palette.primary,
                fontSize: 18,
                fontWeight: "600",
                letterSpacing: 0.2,
              }}
            >
              Open links in app
            </Text>
            {enabled === null ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Switch
                trackColor={{ false: "#767577", true: palette.primary }}
                thumbColor="#f4f3f4"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => setEnabled(!enabled)}
                value={enabled}
              />
            )}
          </View>
          <Text
            style={{
              color: "#888",
              fontSize: 14,
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            Deep links allow you to open supported links directly inside this
            app, instead of your browser. When enabled, tapping a compatible
            link will take you straight to the relevant screen here.
          </Text>
        </View>
      </View>
    </View>
  );
}
