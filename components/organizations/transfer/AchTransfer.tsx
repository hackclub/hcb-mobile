import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import {
  FooterNote,
  FormField,
  FormSection,
  InfoCallout,
  ReadOnlyField,
  TransferSubmitButton,
} from "./TransferFormUI";

import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOffline } from "@/lib/useOffline";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

type AchTransferScreenProps = {
  organization: OrganizationExpanded;
};

export default function AchTransferScreen({
  organization,
}: AchTransferScreenProps) {
  const { withOfflineCheck } = useOffline();
  const hcb = useClient();

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentFor, setPaymentFor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    if (!recipientName.trim()) {
      showAlert("Missing field", "Please enter the recipient's name.");
      return false;
    }
    if (!/^\d{9}$/.test(routingNumber)) {
      showAlert(
        "Invalid routing number",
        "Routing number must be exactly 9 digits.",
      );
      return false;
    }
    if (!accountNumber.trim()) {
      showAlert("Missing field", "Please enter the account number.");
      return false;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      showAlert(
        "Invalid amount",
        "Please enter a valid amount greater than $0.",
      );
      return false;
    }
    if (Math.round(parsed * 100) > organization.balance_cents) {
      showAlert(
        "Insufficient balance",
        `This transfer exceeds your available balance of ${renderMoney(organization.balance_cents)}.`,
      );
      return false;
    }
    if (!paymentFor.trim()) {
      showAlert("Missing field", "Please describe what this transfer is for.");
      return false;
    }
    return true;
  };

  const handleSubmit = withOfflineCheck(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await hcb.post("ach_transfers", {
        json: {
          organization_id: organization.id,
          ach_transfer: {
            recipient_name: recipientName.trim(),
            routing_number: routingNumber,
            account_number: accountNumber.trim(),
            ...(bankName.trim() && { bank_name: bankName.trim() }),
            ...(recipientEmail.trim() && {
              recipient_email: recipientEmail.trim(),
            }),
            amount_money: parseFloat(amount).toFixed(2),
            payment_for: paymentFor.trim(),
            send_email_notification: true,
          },
        },
      });
      showAlert(
        "Transfer submitted",
        "Your ACH transfer has been submitted for processing.",
      );
      setRecipientName("");
      setRecipientEmail("");
      setBankName("");
      setRoutingNumber("");
      setAccountNumber("");
      setAmount("");
      setPaymentFor("");
    } catch (err) {
      console.error("ACH transfer failed", err, {
        context: { organizationId: organization.id, action: "ach_transfer" },
      });
      showAlert("Transfer failed", await parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Stack.Screen
        options={{ headerLargeTitle: true, title: "ACH transfer" }}
      />

      <View style={{ gap: 24 }}>
        <FormSection title="Recipient details">
          <ReadOnlyField
            label="From"
            value={organization.name}
            secondary={renderMoney(organization.balance_cents)}
          />
          <FormField
            label="Recipient name"
            description="Match the name on the recipient's bank account."
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Jane Smith"
            autoCapitalize="words"
          />
          <FormField
            label="Recipient email"
            optional
            description="A confirmation is sent here once the transfer is processed."
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormSection>

        <FormSection title="Payment details">
          <FormField
            label="Routing number"
            value={routingNumber}
            onChangeText={(t) =>
              setRoutingNumber(t.replace(/\D/g, "").slice(0, 9))
            }
            placeholder="123456789"
            keyboardType="number-pad"
            maxLength={9}
          />
          <FormField
            label="Account number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="Bank account number"
            keyboardType="number-pad"
            secureTextEntry
          />
          <FormField
            label="Bank name"
            optional
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. Chase, Bank of America"
            autoCapitalize="words"
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
            label="What's this payment for?"
            description="This helps HCB keep a record of your transactions."
            value={paymentFor}
            onChangeText={setPaymentFor}
            placeholder="Shipment of potions"
          />
        </FormSection>

        <InfoCallout
          title="Important info about ACH transfers"
          points={[
            "ACH transfers can only be sent to U.S. bank accounts.",
            "If you enter the wrong destination, the money will permanently leave your account.",
            "We have limited ability to fix mistakes due to U.S. banking system restrictions.",
            <>
              ACH transfers are{" "}
              <Text style={{ fontWeight: "700", color: palette.info }}>
                irreversible
              </Text>{" "}
              and can&apos;t be canceled.
            </>,
          ]}
        />

        <TransferSubmitButton loading={submitting} onPress={handleSubmit}>
          Send transfer
        </TransferSubmitButton>

        <FooterNote>
          Your transfer will be reviewed on the next business day.
        </FooterNote>
      </View>
    </>
  );
}
