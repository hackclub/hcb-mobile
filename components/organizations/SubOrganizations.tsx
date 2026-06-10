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

const PREVIEW_COUNT = 4;

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function SubOrganizationRow({
  subOrg,
  showDivider,
}: {
  subOrg: Organization;
  showDivider: boolean;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <View>
      {showDivider && (
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
            <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
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
  );
}

export default function SubOrganizations({
  organizationId,
  enabled,
}: {
  organizationId: string;
  enabled: boolean;
}) {
  const { data: subOrganizations } = useOfflineSWR<Organization[]>(
    enabled ? `organizations/${organizationId}/sub_organizations` : null,
  );

  if (!subOrganizations || subOrganizations.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Sub-organizations"
      onSeeAll={
        subOrganizations.length > PREVIEW_COUNT
          ? () =>
              router.push({
                pathname: "/(events)/[id]/sub-organizations",
                params: { id: organizationId },
              })
          : undefined
      }
    >
      {subOrganizations.slice(0, PREVIEW_COUNT).map((subOrg, index) => (
        <SubOrganizationRow
          key={subOrg.id}
          subOrg={subOrg}
          showDivider={index > 0}
        />
      ))}
    </SectionCard>
  );
}
