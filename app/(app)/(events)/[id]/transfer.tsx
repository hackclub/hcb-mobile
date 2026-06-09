import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Button as NativeButton,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import AchTransferScreen from "@/components/organizations/transfer/AchTransfer";
import CheckTransferScreen from "@/components/organizations/transfer/CheckTransfer";
import DisbursementScreen from "@/components/organizations/transfer/Disbursement";
import { Text } from "@/components/Text";
import { showAlert } from "@/lib/alertUtils";
import { theme } from "@/styles/theme";

type TransferType = "hcb" | "ach" | "check";

const TRANSFER_TYPES: { key: TransferType; label: string }[] = [
  { key: "hcb", label: "HCB Transfer" },
  { key: "ach", label: "ACH" },
  { key: "check", label: "Check" },
];

export default function Page() {
  const navigation = useNavigation();
  const { colors: themeColors } = useTheme();
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

  const [transferType, setTransferType] = useState<TransferType>("hcb");

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
        <View
          style={{
            flexDirection: "row",
            backgroundColor: themeColors.card,
            borderRadius: 12,
            padding: 3,
            marginBottom: 4,
          }}
        >
          {TRANSFER_TYPES.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setTransferType(key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor:
                  transferType === key ? themeColors.background : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: transferType === key ? "600" : "400",
                  color: transferType === key ? themeColors.text : "#999",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {organization && transferType === "hcb" && (
          <DisbursementScreen organization={organization} />
        )}
        {organization && transferType === "ach" && (
          <AchTransferScreen organization={organization} />
        )}
        {organization && transferType === "check" && (
          <CheckTransferScreen organization={organization} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
