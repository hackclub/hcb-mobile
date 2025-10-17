import { useTheme } from "@react-navigation/native";
import { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import useSWR from "swr";

import AuthContext from "../../../auth/auth";
import { showAlert } from "../../../lib/alertUtils";
import { logError } from "../../../lib/errorUtils";
import { OrganizationExpanded } from "../../../lib/types/Organization";
import { useIsDark } from "../../../lib/useColorScheme";
import { useOffline } from "../../../lib/useOffline";
import { palette } from "../../../styles/theme";
import { renderMoney } from "../../../utils/util";

type DisbursementScreenProps = {
  organization: OrganizationExpanded;
};

const DisbursementScreen = ({ organization }: DisbursementScreenProps) => {
  const [amount, setAmount] = useState("$0.00");
  const [chosenOrg, setOrganization] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { colors: themeColors } = useTheme();
  const { data: organizations } =
    useSWR<OrganizationExpanded[]>("user/organizations");
  const { tokens } = useContext(AuthContext);
  const { isOnline, withOfflineCheck } = useOffline();
  const isDark = useIsDark();

  const validateInputs = () => {
    const numericAmount = Number(amount.replace("$", "").replace(",", ""));
    if (!chosenOrg) {
      showAlert("Error", "Please select an organization to transfer to.");
      return false;
    }
    if (numericAmount <= 0 || isNaN(numericAmount)) {
      showAlert("Error", "Please enter a valid amount greater than $0.");
      return false;
    }
    if (numericAmount * 100 > organization.balance_cents) {
      showAlert("Error", "Insufficient balance for this transfer.");
      return false;
    }
    if (!reason.trim()) {
      showAlert("Error", "Please provide a reason for the transfer.");
      return false;
    }
    return true;
  };

  const handleTransfer = withOfflineCheck(async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        process.env.EXPO_PUBLIC_API_BASE +
          `/organizations/${organization.id}/transfers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens?.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: organization.id,
            to_organization_id: chosenOrg,
            amount_cents:
              Number(amount.replace("$", "").replace(",", "")) * 100,
            name: reason,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        showAlert(
          "Error",
          errorData.message ||
            "Failed to complete the transfer. Please try again.",
        );
      } else {
        showAlert("Success", "Transfer completed successfully!");
        setOrganization("");
        setAmount("$0.00");
        setReason("");
      }
    } catch (error) {
      logError("Transfer operation failed", error, {
        context: {
          organizationId: organization.id,
          targetOrgId: chosenOrg,
          amount: amount,
          action: "organization_transfer",
        },
      });
      showAlert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (chosenOrg === "") {
      setAmount("$0.00");
    }
  }, [chosenOrg]);

  if (!organizations) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* From Section */}
      <Text
        style={{
          color: themeColors.text,
          fontSize: 18,
          marginVertical: 12,
          fontWeight: "bold",
        }}
      >
        From
      </Text>
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 8,
          padding: 15,
          marginBottom: 15,
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 16 }}>
          {organization.name} ({renderMoney(organization.balance_cents)})
        </Text>
      </View>

      {/* To Section */}
      <Text
        style={{
          color: themeColors.text,
          fontSize: 18,
          marginVertical: 12,
          fontWeight: "bold",
        }}
      >
        To
      </Text>
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 8,
          marginBottom: 15,
        }}
      >
        <RNPickerSelect
          placeholder={{ label: "Select an organization", value: "" }}
          onValueChange={(itemValue: string) => setOrganization(itemValue)}
          darkTheme={isDark}
          style={{
            inputIOS: {
              color: themeColors.text,
              padding: 15,
              fontSize: 16,
              pointerEvents: "none",
            },
            inputAndroid: {
              color: themeColors.text,
              padding: 15,
              fontSize: 16,
            },
          }}
          items={[
            ...organizations
              .filter((org) => org.id !== organization.id)
              .filter((org) => org.playground_mode === false)
              .map((org) => ({ label: org.name, value: org.id })),
          ]}
        />
      </View>
      <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 20 }}>
        You can transfer to any organization you're a part of.
      </Text>

      {/* Amount Section */}
      <Text
        style={{
          color: themeColors.text,
          fontSize: 18,
          marginVertical: 12,
          fontWeight: "bold",
        }}
      >
        Amount
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          color: themeColors.text,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 15,
        }}
        value={amount}
        onChangeText={(text) => {
          const sanitizedText = text.replace(/[^\d.]/g, "");
          // remove 0.00 if user enters a new number
          if (sanitizedText.startsWith("0.00")) {
            setAmount(text.replace("0.00", ""));
            return;
          }
          setAmount(sanitizedText ? `$${sanitizedText}` : "$0.00");
        }}
        placeholder="$0.00"
        placeholderTextColor={themeColors.text}
        keyboardType="numeric"
      />

      {/* Purpose Section */}
      <Text
        style={{
          color: themeColors.text,
          fontSize: 18,
          marginVertical: 12,
          fontWeight: "bold",
        }}
      >
        What is the transfer for?
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          color: themeColors.text,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 10,
        }}
        value={reason}
        onChangeText={(text) => setReason(text)}
        placeholder="Donating extra funds to another organization"
        placeholderTextColor={palette.muted}
      />
      <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 20 }}>
        This is to help HCB keep record of our transactions.
      </Text>

      {/* Transfer Button */}
      <TouchableOpacity
        onPress={handleTransfer}
        disabled={isLoading || !isOnline}
        style={{
          backgroundColor: isOnline
            ? themeColors.primary
            : themeColors.primary + "80",
          padding: 15,
          borderRadius: 8,
          alignItems: "center",
          marginVertical: 20,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            Submit Transfer
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default DisbursementScreen;
