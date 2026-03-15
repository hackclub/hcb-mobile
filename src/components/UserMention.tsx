import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { Text } from "components/Text";
import { View } from "react-native";

import User from "../lib/types/User";

import UserAvatar from "./UserAvatar";

export default function UserMention({
  user,
  scale = 1,
}: {
  user: User;
  scale?: number;
}) {
  const { colors: themeColors } = useTheme();

  const avatarSize = 25 * scale;
  const badgeSize = 40 * scale;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: user.auditor ? 0 : 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <UserAvatar user={user} size={avatarSize} />
        {user.auditor && (
          <View style={{ marginLeft: -10 }}>
            <Icon glyph="admin-badge" color="#f1c40f" size={badgeSize} />
          </View>
        )}
      </View>
      <Text
        style={{
          color: themeColors.text,
          marginLeft: user.auditor ? -5 : 0,
        }}
      >
        {user.name}
      </Text>
    </View>
  );
}
