import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { View, Text } from "react-native";

import { palette } from "../../styles/theme";
import Button from "../Button";

interface TransactionErrorProps {
  onRetry: () => void;
  isOnline: boolean;
}

export const TransactionError = ({
  onRetry,
  isOnline,
}: TransactionErrorProps) => {
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
      <Ionicons
        name="alert-circle"
        size={48}
        color="#EF4444"
        style={{ marginBottom: 16 }}
      />
      <Text
        style={{
          color: themeColors.text,
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Failed to Load Transactions
      </Text>
      <Text
        style={{
          color: palette.muted,
          textAlign: "center",
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        {isOnline
          ? "We couldn't load your transactions. Please try again."
          : "Please check your internet connection and try again."}
      </Text>
      <Button onPress={onRetry} disabled={!isOnline}>
        {isOnline ? "Retry" : "Retry When Online"}
      </Button>
    </View>
  );
};
