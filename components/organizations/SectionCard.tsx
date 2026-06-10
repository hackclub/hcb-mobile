import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";

interface SectionCardProps {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export default function SectionCard({
  title,
  onSeeAll,
  children,
}: SectionCardProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: themeColors.text }}
        >
          {title}
        </Text>
        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ color: palette.muted, fontSize: 14 }}>See all</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
