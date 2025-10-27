import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

import Card from "../../lib/types/Card";

export const CardStatus = ({ card }: { card: Card }) => {
  if (card?.status === "active") {
    return (
      <View
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 14,
            fontWeight: "500",
            color: "#34D399",
          }}
        >
          Active
        </Text>
      </View>
    );
  } else if (card?.status === "frozen") {
    return (
      <View
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Ionicons name="snow" size={14} color="#3B82F6" />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 14,
            fontWeight: "500",
            color: "#3B82F6",
          }}
        >
          Frozen
        </Text>
      </View>
    );
  } else if (card?.status === "canceled") {
    return (
      <View
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Ionicons name="close-circle" size={14} color="#EF4444" />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 14,
            fontWeight: "500",
            color: "#EF4444",
          }}
        >
          Canceled
        </Text>
      </View>
    );
  } else if (card?.status === "expired") {
    return (
      <View
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Ionicons name="time" size={14} color="#F59E0B" />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 14,
            fontWeight: "500",
            color: "#F59E0B",
          }}
        >
          Expired
        </Text>
      </View>
    );
  }
  return null;
};
