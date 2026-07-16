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

import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOffline } from "@/lib/useOffline";
import { renderMoney } from "@/utils/format";

type CheckTransferScreenProps = {
  organization: OrganizationExpanded;
};

export default function CheckTransferScreen({
  organization,
}: CheckTransferScreenProps) {
  const { withOfflineCheck } = useOffline();
  const hcb = useClient();

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentFor, setPaymentFor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    if (!recipientName.trim()) {
      showAlert("Missing field", "Please enter the recipient's name.");
      return false;
    }
    if (!addressLine1.trim()) {
      showAlert("Missing field", "Please enter a street address.");
      return false;
    }
    if (!city.trim()) {
      showAlert("Missing field", "Please enter the city.");
      return false;
    }
    if (state.trim().length !== 2) {
      showAlert(
        "Invalid state",
        "Please enter a 2-letter state code (e.g. CA).",
      );
      return false;
    }
    if (!/^\d{5}$/.test(zip.trim())) {
      showAlert("Invalid ZIP code", "Please enter a valid 5-digit ZIP code.");
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
        `This check exceeds your available balance of ${renderMoney(organization.balance_cents)}.`,
      );
      return false;
    }
    if (!memo.trim()) {
      showAlert("Missing field", "Please enter a memo for the check.");
      return false;
    }
    if (!paymentFor.trim()) {
      showAlert("Missing field", "Please describe what this check is for.");
      return false;
    }
    return true;
  };

  const handleSubmit = withOfflineCheck(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await hcb.post("checks", {
        json: {
          organization_id: organization.id,
          check: {
            recipient_name: recipientName.trim(),
            ...(recipientEmail.trim() && {
              recipient_email: recipientEmail.trim(),
            }),
            address_line1: addressLine1.trim(),
            ...(addressLine2.trim() && { address_line2: addressLine2.trim() }),
            address_city: city.trim(),
            address_state: state.trim().toUpperCase(),
            address_zip: zip.trim(),
            amount_cents: Math.round(parseFloat(amount) * 100),
            memo: memo.trim(),
            payment_for: paymentFor.trim(),
            send_email_notification: true,
          },
        },
      });
      showAlert(
        "Check submitted",
        "Your check has been submitted and is pending approval.",
      );
      setRecipientName("");
      setRecipientEmail("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("");
      setZip("");
      setAmount("");
      setMemo("");
      setPaymentFor("");
    } catch (err) {
      console.error("Check submission failed", err, {
        context: {
          organizationId: organization.id,
          action: "check_transfer",
        },
      });
      showAlert("Submission failed", await parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Stack.Screen options={{ headerLargeTitle: true, title: "Check" }} />

      <View style={{ gap: 24 }}>
        <FormSection title="Recipient details">
          <ReadOnlyField
            label="From"
            value={organization.name}
            secondary={renderMoney(organization.balance_cents)}
          />
          <FormField
            label="Recipient name"
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Jane Smith"
            autoCapitalize="words"
          />
          <FormField
            label="Recipient email"
            optional
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </FormSection>

        <FormSection title="Mailing address">
          <FormField
            label="Street address"
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="123 Main St"
            autoCapitalize="words"
          />
          <FormField
            label="Apt, suite, etc."
            optional
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Apt 4B"
            autoCapitalize="words"
          />
          <FormField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="San Francisco"
            autoCapitalize="words"
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 2 }}>
              <FormField
                label="State"
                value={state}
                onChangeText={(t) =>
                  setState(
                    t
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "")
                      .slice(0, 2),
                  )
                }
                placeholder="CA"
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 3 }}>
              <FormField
                label="ZIP code"
                value={zip}
                onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))}
                placeholder="94107"
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
        </FormSection>

        <FormSection title="Payment details">
          <FormField
            label="Amount"
            prefix="$"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <FormField
            label="Memo"
            description="Printed on the check memo line."
            value={memo}
            onChangeText={setMemo}
            placeholder="For services rendered"
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
          title="About mailed checks"
          points={[
            "Checks are printed and mailed to the address above — double-check it.",
            "Delivery typically takes 5–7 business days once approved.",
            "The recipient must deposit or cash the check for it to clear.",
          ]}
        />

        <TransferSubmitButton loading={submitting} onPress={handleSubmit}>
          Send check
        </TransferSubmitButton>

        <FooterNote>
          Your check will be reviewed on the next business day.
        </FooterNote>
      </View>
    </>
  );
}
