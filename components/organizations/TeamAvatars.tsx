import { useTheme } from "expo-router/react-navigation";
import { View } from "react-native";

import { Text } from "@/components/Text";
import UserAvatar from "@/components/UserAvatar";
import { OrgUser } from "@/lib/types/User";
import { palette } from "@/styles/theme";

const MAX_SHOWN = 8;

export default function TeamAvatars({ users }: { users: OrgUser[] }) {
  const { colors: themeColors } = useTheme();
  const shown = users.slice(0, MAX_SHOWN);
  const overflow = users.length - MAX_SHOWN;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
      }}
    >
      {shown.map((u, i) => (
        <View
          key={u.id}
          style={{
            marginLeft: i === 0 ? 0 : -6,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: themeColors.card,
          }}
        >
          <UserAvatar user={u} size={36} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: -6,
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.slate,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: themeColors.card,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
