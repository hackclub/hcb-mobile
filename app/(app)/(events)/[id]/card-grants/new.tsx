import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { palette } from "@/styles/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: palette.muted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

export default function NewCardGrantPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const { mutate } = useSWRConfig();

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [instructions, setInstructions] = useState("");
  const [oneTimeUse, setOneTimeUse] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim()))
      return "Enter the recipient's email address.";
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) return "Amount must be at least $1.";
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await hcb.post(`organizations/${id}/card_grants`, {
        json: {
          email: email.trim(),
          amount_cents: Math.round(parseFloat(amount) * 100),
          purpose: purpose.trim() || undefined,
          instructions: instructions.trim() || undefined,
          one_time_use: oneTimeUse,
        },
      });
      mutate(`organizations/${id}/card_grants`);
      router.back();
    } catch (err) {
      showAlert(
        "Failed to send grant",
        await parseApiError(err, "Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: themeColors.card,
    color: themeColors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  } as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 32,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: palette.muted, fontSize: 14 }}>
          Send a virtual card preloaded with money. The recipient can spend it
          on your organization's behalf — no reimbursements needed.
        </Text>

        <View style={{ gap: 8 }}>
          <FieldLabel>Recipient email</FieldLabel>
          <TextInput
            placeholder="recipient@example.com"
            placeholderTextColor={palette.muted}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError("");
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Amount</FieldLabel>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.card,
              borderRadius: 10,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 15 }}>$</Text>
            <TextInput
              placeholder="50.00"
              placeholderTextColor={palette.muted}
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                if (error) setError("");
              }}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                color: themeColors.text,
                fontSize: 15,
                padding: 12,
                paddingLeft: 4,
              }}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Purpose (optional)</FieldLabel>
          <TextInput
            placeholder="Travel stipend"
            placeholderTextColor={palette.muted}
            value={purpose}
            onChangeText={setPurpose}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Instructions (optional)</FieldLabel>
          <TextInput
            placeholder="Anything the recipient should know before spending"
            placeholderTextColor={palette.muted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
            style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: themeColors.card,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                color: themeColors.text,
                fontSize: 15,
                fontWeight: "500",
              }}
            >
              One-time use
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>
              Cancel the card after its first purchase
            </Text>
          </View>
          <Switch value={oneTimeUse} onValueChange={setOneTimeUse} />
        </View>

        {!!error && (
          <Text style={{ color: palette.primary, fontSize: 13 }}>{error}</Text>
        )}

        <Button
          variant="primary"
          icon="send"
          iconSize={24}
          loading={submitting}
          onPress={submit}
        >
          Send Grant
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
