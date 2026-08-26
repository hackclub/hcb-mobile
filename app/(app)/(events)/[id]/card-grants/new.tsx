import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import Button from "@/components/Button";
import CardGrantScreen from "@/components/organizations/transfer/CardGrant";
import { Text } from "@/components/Text";
import { useOrganizationPlan } from "@/lib/organization/useOrganizationPlan";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

export default function NewCardGrantPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const headerInset = useHeaderInset();
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${id}`,
  );
  const { hasFeature, isLoading: planLoading } = useOrganizationPlan(id);

  if (!organization || planLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!hasFeature("card_grants")) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <Text
          style={{
            color: themeColors.text,
            fontSize: 20,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Card grants aren't available
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          {organization.name}'s plan doesn't include card grants. Contact HCB if
          you think this is a mistake.
        </Text>
        <Button style={{ marginTop: 8 }} onPress={() => router.back()}>
          Go back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          paddingTop: 20 + headerInset,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <CardGrantScreen organization={organization} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
