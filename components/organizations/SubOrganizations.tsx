import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { Pressable, View } from "react-native";

import SectionCard from "./SectionCard";

import { Text } from "@/components/Text";
import Organization from "@/lib/types/Organization";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { orgColor } from "@/utils/org";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function SubOrganizations({
  organizationId,
  enabled,
}: {
  organizationId: string;
  enabled: boolean;
}) {
  const { colors: themeColors } = useTheme();
  const { data: subOrganizations } = useOfflineSWR<Organization[]>(
    enabled ? `organizations/${organizationId}/sub_organizations` : null,
  );

  if (!subOrganizations || subOrganizations.length === 0) {
    return null;
  }

  return (
    <SectionCard title="Sub-organizations">
      {subOrganizations.map((subOrg, index) => (
        <View key={subOrg.id}>
          {index > 0 && (
            <View
              style={{
                height: 1,
                backgroundColor: themeColors.border,
                marginHorizontal: 16,
              }}
            />
          )}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(events)/[id]",
                params: {
                  id: subOrg.id,
                  fallbackData: JSON.stringify(subOrg),
                },
              })
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {subOrg.icon ? (
              <Image
                source={{ uri: subOrg.icon }}
                style={{ width: 36, height: 36, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: orgColor(subOrg.id),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "700" }}
                >
                  {getInitials(subOrg.name)}
                </Text>
              </View>
            )}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: themeColors.text,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {subOrg.name}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </Pressable>
        </View>
      ))}
    </SectionCard>
  );
}
