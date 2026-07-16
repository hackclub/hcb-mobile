import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { View } from "react-native";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";
import { openOnWebsite } from "@/utils/handoff";

interface ErrorHandoffProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  websiteUrl?: string;
}

export default function ErrorHandoff({
  title = "Something went wrong",
  message = "We couldn't load this. You can try again or continue on the website.",
  onRetry,
  websiteUrl,
}: ErrorHandoffProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

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
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 400,
          alignItems: "center",
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
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
          <Ionicons name="alert-circle" size={48} color={palette.primary} />
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
          {title}
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
          {message}
        </Text>
        {onRetry && (
          <Button
            style={{
              width: "100%",
              backgroundColor: themeColors.primary,
              borderRadius: 12,
              height: 50,
              marginBottom: websiteUrl ? 16 : 0,
            }}
            color="#fff"
            onPress={onRetry}
          >
            Try Again
          </Button>
        )}
        {websiteUrl && (
          <Button
            style={{
              width: "100%",
              backgroundColor: palette.slate,
              borderRadius: 12,
              height: 50,
            }}
            color="#fff"
            onPress={() => openOnWebsite(websiteUrl)}
          >
            Continue on Website
          </Button>
        )}
      </View>
    </View>
  );
}
