import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

import Button from "../Button";

interface CardErrorProps {
  error: string;
  onRetry: () => void;
}

export default function CardError({ error, onRetry }: CardErrorProps) {
  return (
    <View
      style={{
        padding: 20,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <Ionicons name="alert-circle" size={24} color="#EF4444" />
      <Text
        style={{
          color: "#EF4444",
          marginVertical: 10,
          textAlign: "center",
        }}
      >
        {error}
      </Text>
      <Button onPress={onRetry}>Retry</Button>
    </View>
  );
}
