import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { SubOrganizationRow } from "@/components/organizations/SubOrganizations";
import { Text } from "@/components/Text";
import Organization from "@/lib/types/Organization";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

export default function SubOrganizationsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const { data: subOrganizations, isLoading } = useOfflineSWR<Organization[]>(
    `organizations/${id}/sub_organizations`,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
      }}
    >
      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}
      {!isLoading && (!subOrganizations || subOrganizations.length === 0) && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
          <Ionicons name="business-outline" size={40} color={palette.muted} />
          <Text
            style={{ color: palette.muted, fontSize: 15, fontWeight: "600" }}
          >
            No sub-organizations
          </Text>
        </View>
      )}
      {subOrganizations && subOrganizations.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {subOrganizations.map((subOrg, index) => (
            <SubOrganizationRow
              key={subOrg.id}
              subOrg={subOrg}
              showDivider={index > 0}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
