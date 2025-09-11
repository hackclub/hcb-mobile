import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { View, Text } from "react-native";

import { palette } from "../../styles/theme";

interface EmptyStateProps {
  isOnline: boolean;
}

export const EmptyState = ({ isOnline }: EmptyStateProps) => {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {!isOnline ? (
        <>
          <Ionicons
            name="cloud-offline"
            size={48}
            color={palette.muted}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{
              color: themeColors.text,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            You're Offline
          </Text>
          <Text
            style={{ color: palette.muted, textAlign: "center", fontSize: 14 }}
          >
            Please check your internet connection and try again
          </Text>
        </>
      ) : (
        <>
          <Icon
            glyph="sad"
            color={palette.muted}
            size={48}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{
              color: themeColors.text,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            No Transactions Yet
          </Text>
          <Text
            style={{ color: palette.muted, textAlign: "center", fontSize: 14 }}
          >
            Your transaction history will appear here
          </Text>
        </>
      )}
    </View>
  );
};
