import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

import User from "../lib/types/User";

import UserAvatar from "./UserAvatar";

export default function UserMention({ user }: { user: User }) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: user.admin ? 5 : 10,
      }}
    >
      <UserAvatar user={user} />
      {user.admin && <Ionicons name="flash" color="#f1c40f" size={15} />}
      <Text style={{ color: themeColors.text }}>{user.name}</Text>
    </View>
  );
}
