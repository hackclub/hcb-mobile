import { View } from "react-native";

import { Text } from "@/components/Text";
import { TagColor } from "@/lib/types/Tag";

export const TAG_COLORS: Record<TagColor, string> = {
  muted: "#8492a6",
  red: "#ec3750",
  orange: "#ff8c37",
  yellow: "#f1c40f",
  green: "#33d6a6",
  cyan: "#5bc0de",
  blue: "#338eda",
  purple: "#a633d6",
};

export function resolveTagColor(color: string): string {
  return TAG_COLORS[color as TagColor] ?? TAG_COLORS.muted;
}

interface TagChipProps {
  tag: { label: string; color: string; emoji?: string | null };
  small?: boolean;
  active?: boolean;
}

export default function TagChip({ tag, small = false, active = false }: TagChipProps) {
  const hex = resolveTagColor(tag.color);
  const bg = active ? hex : hex + "26"; // solid when active, ~15% opacity otherwise
  const border = active ? hex : hex + "4D";
  const textColor = active ? "#fff" : hex;
  const dotColor = active ? "rgba(255,255,255,0.8)" : hex;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: small ? 7 : 10,
        paddingVertical: small ? 2 : 5,
        borderRadius: 20,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignSelf: "flex-start",
      }}
    >
      {tag.emoji ? (
        <Text style={{ fontSize: small ? 11 : 13, lineHeight: small ? 16 : 18 }}>
          {tag.emoji}
        </Text>
      ) : (
        <View
          style={{
            width: small ? 6 : 8,
            height: small ? 6 : 8,
            borderRadius: 4,
            backgroundColor: dotColor,
          }}
        />
      )}
      <Text
        style={{
          color: textColor,
          fontSize: small ? 11 : 13,
          fontWeight: "600",
        }}
      >
        {tag.label}
      </Text>
    </View>
  );
}
