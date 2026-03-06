import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Button as NativeButton,
  Platform,
  ScrollView,
  View,
} from "react-native";

import DisbursementScreen from "@/components/organizations/transfer/Disbursement";
import { showAlert } from "@/lib/alertUtils";
import { theme } from "@/styles/theme";

export default function Page() {
  const navigation = useNavigation();
  const { organization: _organization } = useLocalSearchParams();
  const organization =
    typeof _organization === "string"
      ? (() => {
          try {
            return JSON.parse(_organization);
          } catch {
            return null;
          }
        })()
      : null;

  useEffect(() => {
    if (organization) return;

    showAlert(
      "Unable to Open Transfer",
      "We couldn't load organization details for this transfer. Please go back and try again.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  }, [organization]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <>
          {Platform.OS === "android" ? (
            <View style={{ marginRight: 20 }}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.text}
                onPress={() => router.back()}
              />
            </View>
          ) : (
            <NativeButton
              title="Done"
              color={theme.colors.text}
              onPress={() => router.back()}
            />
          )}
        </>
      ),
    });
  }, [navigation]);

  const [transferType] = useState<"ach" | "check" | "hcb">("hcb");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior for platform
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 0 }}
      >
        {/* Transfer Type Buttons */}
        {/* <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "hcb" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("hcb")}
          >
            HCB
          </Button>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "ach" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("ach")}
          >
            ACH
          </Button>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "check" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("check")}
          >
            Check
          </Button>
        </View> */}

        {/* Display transfer screen based on transfer type */}
        {transferType === "hcb" && organization && (
          <DisbursementScreen organization={organization} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
