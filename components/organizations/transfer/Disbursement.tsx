import { router, Stack } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { useCallback, useContext, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import useSWR from "swr";

import { OrgSelectField } from "./OrgSelectField";
import {
  FooterNote,
  FormField,
  FormSection,
  ReadOnlyField,
  TransferSubmitButton,
} from "./TransferFormUI";

import { parseApiError, showAlert } from "@/lib/alertUtils";
import AuthContext from "@/lib/auth/auth";
import { getAccessToken } from "@/lib/auth/tokenUtils";
import { consumePendingOrg } from "@/lib/orgPickerStore";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOffline } from "@/lib/useOffline";
import { renderMoney } from "@/utils/format";

type DisbursementScreenProps = {
  organization: OrganizationExpanded;
};

const DisbursementScreen = ({ organization }: DisbursementScreenProps) => {
  const [amount, setAmount] = useState("");
  const [chosenOrg, setOrganization] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { colors: themeColors } = useTheme();
  const { data: organizations } =
    useSWR<OrganizationExpanded[]>("user/organizations");
  const { tokenResponse } = useContext(AuthContext);

  const accessToken = getAccessToken(tokenResponse);
  const { withOfflineCheck } = useOffline();

  const selectedOrg = (organizations ?? []).find((o) => o.id === chosenOrg);

  // When returning from the org-picker sheet, apply the chosen recipient.
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingOrg();
      if (pending) setOrganization(pending);
    }, []),
  );

  const openOrgPicker = () => {
    router.push({
      pathname: "/(events)/[id]/transfers/select-org",
      params: {
        id: organization.id,
        selected: chosenOrg,
        exclude: organization.id,
      },
    });
  };

  const validateInputs = () => {
    const numericAmount = parseFloat(amount);
    if (!chosenOrg) {
      showAlert("Error", "Please select an organization to transfer to.");
      return false;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert("Error", "Please enter a valid amount greater than $0.");
      return false;
    }
    if (Math.round(numericAmount * 100) > organization.balance_cents) {
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
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: organization.id,
            to_organization_id: chosenOrg,
            amount_cents: Math.round(parseFloat(amount) * 100),
            name: reason,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        showAlert(
          "Error",
          errorData.messages?.[0] ||
            "Failed to complete the transfer. Please try again.",
        );
      } else {
        showAlert("Success", "Transfer completed successfully!");
        setOrganization("");
        setAmount("");
        setReason("");
      }
    } catch (error) {
      console.error("Transfer operation failed", error, {
        context: {
          organizationId: organization.id,
          targetOrgId: chosenOrg,
          amount: amount,
          action: "organization_transfer",
        },
      });
      showAlert("Error", await parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  });

  if (!organizations) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerLargeTitle: true, title: "New HCB transfer" }}
      />

      <View style={{ gap: 24 }}>
        <FormSection title="Transfer details">
          <ReadOnlyField
            label="From"
            value={organization.name}
            secondary={renderMoney(organization.balance_cents)}
          />

          <OrgSelectField
            label="To"
            description="You can transfer to any organization you're a part of."
            selectedOrg={selectedOrg}
            onPress={openOrgPicker}
          />

          <FormField
            label="Amount"
            prefix="$"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <FormField
            label="What's this transfer for?"
            description="This is to help HCB keep a record of your transactions."
            value={reason}
            onChangeText={setReason}
            placeholder="Donating extra funds to another organization"
          />
        </FormSection>

        <TransferSubmitButton loading={isLoading} onPress={handleTransfer}>
          Send transfer
        </TransferSubmitButton>

        <FooterNote>
          Transfers between HCB organizations are instant.
        </FooterNote>
      </View>
    </>
  );
};

export default DisbursementScreen;
