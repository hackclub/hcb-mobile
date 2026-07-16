import { format, isValid, parse } from "date-fns";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSWRConfig } from "swr";

import {
  FooterNote,
  FormField,
  FormSection,
  ReadOnlyField,
  ToggleField,
  TransferSubmitButton,
} from "./TransferFormUI";

import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOffline } from "@/lib/useOffline";
import { renderMoney } from "@/utils/format";

type CardGrantScreenProps = {
  organization: OrganizationExpanded;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CardGrantScreen({
  organization,
}: CardGrantScreenProps) {
  const { withOfflineCheck } = useOffline();
  const hcb = useClient();
  const { mutate } = useSWRConfig();

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [purpose, setPurpose] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [oneTimeUse, setOneTimeUse] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The recipient-facing expiration date is entered as MM/DD/YYYY and sent to
  // the API as an ISO date (YYYY-MM-DD). Returns null when the input is empty
  // or not a valid future date.
  const parseExpiresOn = (): Date | null => {
    if (!expiresOn.trim()) return null;
    const parsed = parse(expiresOn.trim(), "MM/dd/yyyy", new Date());
    return isValid(parsed) ? parsed : null;
  };

  const validate = (): boolean => {
    if (!EMAIL_RE.test(email.trim())) {
      showAlert("Invalid email", "Please enter the recipient's email address.");
      return false;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || Math.round(parsed * 100) < 100) {
      showAlert("Invalid amount", "Amount must be at least $1.");
      return false;
    }
    if (Math.round(parsed * 100) > organization.balance_cents) {
      showAlert(
        "Insufficient balance",
        `This grant exceeds your available balance of ${renderMoney(organization.balance_cents)}.`,
      );
      return false;
    }
    if (expiresOn.trim() && !parseExpiresOn()) {
      showAlert(
        "Invalid date",
        "Enter the expiration date as MM/DD/YYYY (e.g. 07/15/2027).",
      );
      return false;
    }
    return true;
  };

  const handleSubmit = withOfflineCheck(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const expiresDate = parseExpiresOn();
      await hcb.post(`organizations/${organization.id}/card_grants`, {
        json: {
          email: email.trim(),
          amount_cents: Math.round(parseFloat(amount) * 100),
          expires_on: expiresDate
            ? format(expiresDate, "yyyy-MM-dd")
            : undefined,
          purpose: purpose.trim() || undefined,
          invite_message: inviteMessage.trim() || undefined,
          instructions: instructions.trim() || undefined,
          one_time_use: oneTimeUse,
        },
      });
      mutate(`organizations/${organization.id}/card_grants`);
      showAlert(
        "Grant sent",
        "The recipient will receive an email with their virtual card.",
      );
      router.back();
    } catch (err) {
      console.error("Card grant failed", err, {
        context: { organizationId: organization.id, action: "card_grant" },
      });
      showAlert("Failed to send grant", await parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Stack.Screen options={{ headerLargeTitle: true, title: "Card grant" }} />

      <View style={{ gap: 24 }}>
        <FormSection title="Grant details">
          <ReadOnlyField
            label="From"
            value={organization.name}
            secondary={renderMoney(organization.balance_cents)}
          />
          <FormField
            label="Recipient email"
            description="They'll receive an email to claim their virtual card."
            value={email}
            onChangeText={setEmail}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            label="Expires on"
            optional
            description="When the card stops working. Defaults to no expiration."
            value={expiresOn}
            onChangeText={setExpiresOn}
            placeholder="MM/DD/YYYY"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </FormSection>

        <FormSection title="Details (optional)">
          <FormField
            label="Purpose"
            optional
            description="Shown to the recipient."
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Pizza for a club meeting"
          />
          <FormField
            label="Invitation message"
            optional
            description="Included in the card grant invitation email sent to the recipient."
            value={inviteMessage}
            onChangeText={setInviteMessage}
            placeholder="It's pizza time!"
            multiline
            numberOfLines={3}
            style={{ minHeight: 72, textAlignVertical: "top" }}
          />
          <FormField
            label="Instructions"
            optional
            description="Anything the recipient should know before spending."
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Please only purchase a soldering iron…"
            multiline
            numberOfLines={3}
            style={{ minHeight: 72, textAlignVertical: "top" }}
          />
          <ToggleField
            label="One-time use"
            description="Cancel the card after its first purchase."
            value={oneTimeUse}
            onValueChange={setOneTimeUse}
          />
        </FormSection>

        <TransferSubmitButton loading={submitting} onPress={handleSubmit}>
          Send grant
        </TransferSubmitButton>

        <FooterNote>
          The recipient will be emailed once the grant is sent.
        </FooterNote>
      </View>
    </>
  );
}
