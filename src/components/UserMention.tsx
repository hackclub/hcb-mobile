import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import User from "../lib/types/User";
import { palette } from "../theme";

export default function UserMention({ user }: { user: User }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: user.admin ? 5 : 10,
      }}
    >
      <Image
        source={user.avatar}
        placeholder={require("../../assets/placeholder.png")}
        cachePolicy="disk"
        style={{ width: 25, height: 25, borderRadius: 400 }}
      />
      {user.admin && <Ionicons name="flash" color="#f1c40f" size={15} />}
      <Text style={{ color: palette.smoke }}>{user.name}</Text>
    </View>
  );
}
