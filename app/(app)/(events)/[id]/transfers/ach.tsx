import { useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import AchTransferScreen from "@/components/organizations/transfer/AchTransfer";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOfflineSWR } from "@/lib/useOfflineSWR";

export default function AchTransferPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${id}`,
  );

  if (!organization) {
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <AchTransferScreen organization={organization} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
