import { Stack } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import { TextInput, View } from "react-native";

import Button from "@/components/Button";
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
  const { colors: themeColors } = useTheme();
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

  const labelStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: palette.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  };

  const inputContainerStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };

  const inputStyle = {
    color: themeColors.text,
    fontSize: 16,
  };

  return (
    <>
      <Stack.Screen
        options={{ headerLargeTitle: true, title: "New ACH transfer" }}
      />

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
          <Text style={labelStyle}>Routing number</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={routingNumber}
              onChangeText={(t) =>
                setRoutingNumber(t.replace(/\D/g, "").slice(0, 9))
              }
              placeholder="9-digit routing number"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              keyboardType="number-pad"
              maxLength={9}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Account number</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Bank account number"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              keyboardType="number-pad"
              secureTextEntry
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Bank name (optional)</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Chase, Bank of America"
              placeholderTextColor={palette.muted}
              style={inputStyle}
              autoCapitalize="words"
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
          <Text style={labelStyle}>Payment for</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={paymentFor}
              onChangeText={setPaymentFor}
              placeholder="Brief description of the payment"
              placeholderTextColor={palette.muted}
              style={inputStyle}
            />
          </View>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            This description helps HCB track the purpose of the transfer.
          </Text>
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
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            A confirmation will be sent to this email when the transfer is
            processed.
          </Text>
        </View>

        <Button
          variant="primary"
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: 8, marginBottom: 24 }}
        >
          Submit transfer
        </Button>
      </View>
    </>
  );
}
