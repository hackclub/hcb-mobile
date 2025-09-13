import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Text, View } from "react-native";

import { palette } from "../../styles/theme";
import Button from "../Button";

interface AccessDeniedProps {
  orgId: string;
  onGoBack: () => void;
}

export default function AccessDenied({ orgId, onGoBack }: AccessDeniedProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 400,
          alignItems: "center",
          elevation: 8,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: `${palette.primary}15`,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <Ionicons name="lock-closed" size={48} color={palette.primary} />
        </View>
        <Text
          style={{
            color: themeColors.text,
            fontSize: 28,
            fontWeight: "700",
            marginBottom: 16,
            textAlign: "center",
            letterSpacing: -0.5,
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 17,
            lineHeight: 24,
            textAlign: "center",
            marginBottom: 32,
            paddingHorizontal: 8,
          }}
        >
          You don't have permission to view this organization. Please contact
          the organization's manager for access.
        </Text>
        <Button
          style={{
            width: "100%",
            backgroundColor: themeColors.primary,
            borderRadius: 12,
            height: 50,
            marginBottom: 16,
          }}
          color="#fff"
          onPress={onGoBack}
        >
          Go Back
        </Button>
        <Button
          style={{
            width: "100%",
            backgroundColor: palette.slate,
            borderRadius: 12,
            height: 50,
          }}
          color="#fff"
          onPress={() => Linking.openURL(`https://hcb.hackclub.com/${orgId}`)}
        >
          View on Website
        </Button>
      </View>
    </View>
  );
}
