import { useTheme } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, View, useWindowDimensions } from "react-native";

import { Text } from "@/components/Text";
import UserAvatar from "@/components/UserAvatar";
import { OrgUser } from "@/lib/types/User";
import { palette } from "@/styles/theme";

const MAX_SHOWN = 8;
const AVATAR_SIZE = 36;
const BORDER = 2;
const OUTER_SIZE = AVATAR_SIZE + BORDER * 2;
const OVERLAP = 6;
const STEP = OUTER_SIZE - OVERLAP;
const PADDING_HORIZONTAL = 16;

export default function TeamAvatars({ users }: { users: OrgUser[] }) {
  const { colors: themeColors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState<number | null>(null);

  const { shown, overflow } = useMemo(() => {
    const available = (rowWidth ?? windowWidth - 32) - PADDING_HORIZONTAL * 2;
    const fits = (n: number, badge: boolean) =>
      OUTER_SIZE + (n - 1) * STEP + (badge ? STEP : 0) <= available;

    let count = Math.min(MAX_SHOWN, users.length);
    if (!fits(count, count < users.length)) {
      while (count > 1 && !fits(count, true)) count--;
    }

    return { shown: users.slice(0, count), overflow: users.length - count };
  }, [users, rowWidth, windowWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== rowWidth) setRowWidth(width);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: PADDING_HORIZONTAL,
        paddingBottom: 16,
      }}
    >
      {shown.map((u, i) => (
        <View
          key={u.id}
          style={{
            marginLeft: i === 0 ? 0 : -OVERLAP,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: themeColors.card,
          }}
        >
          <UserAvatar user={u} size={AVATAR_SIZE} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            marginLeft: -OVERLAP,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
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
