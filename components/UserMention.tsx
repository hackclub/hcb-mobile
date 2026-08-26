import Icon from "@thedev132/hackclub-icons-rn";
import { useTheme } from "expo-router/react-navigation";
import { View } from "react-native";

import UserAvatar from "./UserAvatar";

import { Text } from "@/components/Text";
import User from "@/lib/types/User";

export default function UserMention({
  user,
  scale = 1,
  fontSize,
}: {
  user: User;
  scale?: number;
  fontSize?: number;
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
          ...(fontSize !== undefined && { fontSize }),
        }}
      >
        {user.name}
      </Text>
    </View>
  );
}
