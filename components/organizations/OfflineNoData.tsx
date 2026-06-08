import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { View } from "react-native";

import Button from "@/components/Button";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";

interface OfflineNoDataProps {
  onRetry: () => void;
  onGoBack: () => void;
}

export default function OfflineNoData({
  onRetry,
  onGoBack,
}: OfflineNoDataProps) {
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
            backgroundColor: `${palette.slate}15`,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <Ionicons name="cloud-offline" size={48} color={palette.slate} />
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
          No Cached Data
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
          You're offline and we don't have any cached data for this
          organization. Please connect to the internet to load the organization
          details.
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
          onPress={onRetry}
        >
          Try Again
        </Button>
        <Button
          style={{
            width: "100%",
            backgroundColor: palette.slate,
            borderRadius: 12,
            height: 50,
          }}
          color="#fff"
          onPress={onGoBack}
        >
          Go Back
        </Button>
      </View>
    </View>
  );
}
