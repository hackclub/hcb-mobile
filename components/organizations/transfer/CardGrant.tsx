import { format, isValid, parse } from "date-fns";
import { Stack, router } from "expo-router";
import { useMemo, useState } from "react";
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

  // Single source of truth for "is this sendable" — drives both the button's
  // enabled state and the reason shown under it, so they can't disagree.
  const blockingReason = useMemo((): string | null => {
    if (!EMAIL_RE.test(email.trim()))
      return "Enter the recipient's email address.";
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || Math.round(parsed * 100) < 100)
      return "The amount must be at least $1.";
    if (Math.round(parsed * 100) > organization.balance_cents)
      return `This exceeds your available balance of ${renderMoney(organization.balance_cents)}.`;
    if (expiresOn.trim() && !parseExpiresOn())
      return "Enter the expiration date as MM/DD/YYYY (e.g. 07/15/2027).";
    return null;
    // parseExpiresOn is derived from expiresOn, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, amount, expiresOn, organization.balance_cents]);

  const hasInput = Boolean(email || amount || expiresOn);

  const handleSubmit = withOfflineCheck(async () => {
    if (blockingReason) {
      showAlert("Can't send yet", blockingReason);
      return;
    }
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

        <TransferSubmitButton
          loading={submitting}
          disabled={!!blockingReason}
          onPress={handleSubmit}
        >
          Send grant
        </TransferSubmitButton>

        <FooterNote>
          {blockingReason && hasInput
            ? blockingReason
            : "The recipient will be emailed once the grant is sent."}
        </FooterNote>
      </View>
    </>
  );
}
