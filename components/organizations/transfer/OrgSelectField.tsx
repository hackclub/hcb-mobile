import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "expo-router/react-navigation";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Text";
import Organization from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette, radii } from "@/styles/theme";
import { orgColor } from "@/utils/org";

/* -------------------------------------------------------------------------- */
/*  Org avatar — icon image or a colored rounded square fallback.             */
/* -------------------------------------------------------------------------- */

export function OrgAvatar({
  org,
  size = 36,
}: {
  org: Organization;
  size?: number;
}) {
  if (org.icon) {
    return (
      <Image
        source={{ uri: org.icon }}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: size, height: size, borderRadius: radii.md }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor: orgColor(org.id),
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Org select field — a trigger showing the chosen org (with avatar). Tapping */
/*  opens the org-picker bottom sheet (a native formSheet route).             */
/* -------------------------------------------------------------------------- */

export function OrgSelectField({
  label,
  description,
  selectedOrg,
  onPress,
  placeholder = "Select an organization",
}: {
  label: string;
  description?: string;
  selectedOrg?: Organization;
  onPress: () => void;
  placeholder?: string;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: themeColors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          paddingHorizontal: 14,
          paddingVertical: 10,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {selectedOrg ? <OrgAvatar org={selectedOrg} size={28} /> : null}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: selectedOrg ? themeColors.text : palette.muted,
            fontSize: 16,
          }}
        >
          {selectedOrg ? selectedOrg.name : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
