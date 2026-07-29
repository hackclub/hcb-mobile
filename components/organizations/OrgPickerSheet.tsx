import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import useSWR from "swr";

import { OrgAvatar } from "@/components/organizations/transfer/OrgSelectField";
import { Text } from "@/components/Text";
import { setPendingOrg } from "@/lib/orgPickerStore";
import Organization from "@/lib/types/Organization";
import { palette } from "@/styles/theme";

/**
 * Body of the org-picker bottom sheet. Rendered by thin formSheet route files in
 * each navigation stack that needs it. Reads two optional params:
 *   - selected: the currently chosen org id (shown with a checkmark)
 *   - exclude:  an org id to omit from the list (e.g. the sender in a transfer)
 * On tap it stashes the choice via the org-picker store and pops back; the
 * opener reads it in a useFocusEffect.
 */
export default function OrgPickerSheet() {
  const { selected, exclude } = useLocalSearchParams<{
    selected?: string;
    exclude?: string;
  }>();
  const { colors: themeColors } = useTheme();
  const { data: organizations } = useSWR<Organization[]>("user/organizations");

  const eligibleOrgs = (organizations ?? [])
    .filter((org) => org.playground_mode === false)
    .filter((org) => org.id !== exclude);

  const handleSelect = (orgId: string) => {
    setPendingOrg(orgId);
    router.back();
  };

  if (!organizations) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    // No backgroundColor: the formSheet's own material shows through, matching
    // the translucent native header above it.
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {eligibleOrgs.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
          <Ionicons name="business-outline" size={40} color={palette.muted} />
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            No organizations available.
          </Text>
        </View>
      ) : (
        eligibleOrgs.map((org) => {
          const isSelected = org.id === selected;
          return (
            <Pressable
              key={org.id}
              onPress={() => handleSelect(org.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <OrgAvatar org={org} size={40} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: themeColors.text,
                  fontSize: 17,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {org.name}
              </Text>
              {isSelected ? (
                <Ionicons
                  name="checkmark"
                  size={22}
                  color={themeColors.primary}
                />
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
