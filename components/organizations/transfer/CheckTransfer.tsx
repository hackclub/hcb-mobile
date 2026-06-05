import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import { TextInput, View } from "react-native";

import Button from "@/components/Button";
import PageTitle from "@/components/PageTitle";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOffline } from "@/lib/useOffline";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

type CheckTransferScreenProps = {
  organization: OrganizationExpanded;
};

export default function CheckTransferScreen({
  organization,
}: CheckTransferScreenProps) {
  const { colors: themeColors } = useTheme();
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
      showAlert("Invalid state", "Please enter a 2-letter state code (e.g. CA).");
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

  const labelStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: palette.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  };

  const inputContainerStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };

  const inputStyle = {
    color: themeColors.text,
    fontSize: 16,
  };

  return (
    <>
      <PageTitle title="New check" />

      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>From</Text>
          <View style={inputContainerStyle}>
            <Text style={{ color: themeColors.text, fontSize: 16 }}>
              {organization.name} ({renderMoney(organization.balance_cents)})
            </Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Recipient name</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Jane Smith"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Street address</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="123 Main St"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Apt, suite, etc. (optional)</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Apt 4B"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2, gap: 6 }}>
            <Text style={labelStyle}>City</Text>
            <View style={inputContainerStyle}>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="San Francisco"
                placeholderTextColor={palette.muted}
                style={inputStyle}
                autoCapitalize="words"
              />
            </View>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={labelStyle}>State</Text>
            <View style={inputContainerStyle}>
              <TextInput
                value={state}
                onChangeText={(t) =>
                  setState(t.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))
                }
                placeholder="CA"
                placeholderTextColor={palette.muted}
                style={inputStyle}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>ZIP code</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={zip}
              onChangeText={(t) =>
                setZip(t.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="94107"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Amount</Text>
          <View
            style={{
              ...inputContainerStyle,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={{ color: palette.muted, fontSize: 17, fontWeight: "500" }}
            >
              $
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={palette.muted}
              style={{ ...inputStyle, flex: 1 }}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Memo</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="For services rendered"
              placeholderTextColor={palette.muted}
              style={inputStyle}
            />
          </View>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            Printed on the check memo line.
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Payment for</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={paymentFor}
              onChangeText={setPaymentFor}
              placeholder="Brief description for HCB records"
              placeholderTextColor={palette.muted}
              style={inputStyle}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Recipient email (optional)</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="recipient@example.com"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Button
          variant="primary"
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: 8, marginBottom: 24 }}
        >
          Send check
        </Button>
      </View>
    </>
  );
}
