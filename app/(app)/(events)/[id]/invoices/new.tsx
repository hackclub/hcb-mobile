import { Ionicons } from "@expo/vector-icons";
import { addDays, format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { Sponsor } from "@/lib/types/Invoice";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export default function NewInvoicePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();
  const { mutate } = useSWRConfig();

  const { data: sponsors, isLoading: sponsorsLoading } = useOfflineSWR<
    Sponsor[]
  >(`organizations/${id}/sponsors`);

  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [newSponsor, setNewSponsor] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const creatingSponsor =
    newSponsor || (!sponsorsLoading && (!sponsors || sponsors.length === 0));

  const validate = (): string | null => {
    if (creatingSponsor) {
      if (!sponsorName.trim()) return "Enter the sponsor's name.";
      if (!EMAIL_RE.test(sponsorEmail.trim()))
        return "Enter a valid sponsor email.";
      if (
        !addressLine1.trim() ||
        !addressCity.trim() ||
        !addressState.trim() ||
        !addressPostalCode.trim()
      )
        return "Enter the sponsor's full address.";
    } else if (!sponsorId) {
      return "Choose a sponsor to invoice.";
    }
    if (!description.trim()) return "Describe what this invoice is for.";
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) return "Amount must be at least $1.";
    if (!DATE_RE.test(dueDate) || isNaN(new Date(dueDate).getTime()))
      return "Enter the due date as YYYY-MM-DD.";
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
      let targetSponsorId = sponsorId;
      if (creatingSponsor) {
        const sponsor = await hcb
          .post(`organizations/${id}/sponsors`, {
            json: {
              sponsor: {
                name: sponsorName.trim(),
                contact_email: sponsorEmail.trim(),
                address_line1: addressLine1.trim(),
                address_line2: addressLine2.trim() || undefined,
                address_city: addressCity.trim(),
                address_state: addressState.trim(),
                address_postal_code: addressPostalCode.trim(),
                address_country: "US",
              },
            },
          })
          .json<Sponsor>();
        targetSponsorId = sponsor.id;
      }
      await hcb.post(`organizations/${id}/invoices`, {
        json: {
          sponsor_id: targetSponsorId,
          invoice: {
            due_date: dueDate,
            item_description: description.trim(),
            item_amount: Math.round(parseFloat(amount) * 100),
          },
        },
      });
      mutate(`organizations/${id}/invoices`);
      mutate(`organizations/${id}/sponsors`);
      router.back();
    } catch (err) {
      showAlert(
        "Failed to create invoice",
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
        <View style={{ gap: 8 }}>
          <FieldLabel>Sponsor</FieldLabel>
          {sponsors && sponsors.length > 0 && (
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {sponsors.map((sponsor, index) => {
                const selected = !newSponsor && sponsorId === sponsor.id;
                return (
                  <View key={sponsor.id}>
                    {index > 0 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.07)"
                            : "rgba(0,0,0,0.06)",
                          marginHorizontal: 16,
                        }}
                      />
                    )}
                    <Pressable
                      onPress={() => {
                        setSponsorId(sponsor.id);
                        setNewSponsor(false);
                        if (error) setError("");
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: themeColors.text,
                            fontSize: 15,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {sponsor.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: palette.muted,
                            fontSize: 13,
                            marginTop: 2,
                          }}
                        >
                          {sponsor.contact_email}
                        </Text>
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={palette.info}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          {sponsors && sponsors.length > 0 && (
            <Pressable
              onPress={() => {
                setNewSponsor((v) => !v);
                if (error) setError("");
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons
                name={
                  newSponsor ? "remove-circle-outline" : "add-circle-outline"
                }
                size={18}
                color={palette.info}
              />
              <Text style={{ color: palette.info, fontSize: 14 }}>
                {newSponsor ? "Use an existing sponsor" : "New sponsor"}
              </Text>
            </Pressable>
          )}
        </View>

        {creatingSponsor && (
          <View style={{ gap: 10 }}>
            <TextInput
              placeholder="Sponsor name"
              placeholderTextColor={palette.muted}
              value={sponsorName}
              onChangeText={setSponsorName}
              style={inputStyle}
            />
            <TextInput
              placeholder="sponsor@company.com"
              placeholderTextColor={palette.muted}
              value={sponsorEmail}
              onChangeText={setSponsorEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={inputStyle}
            />
            <TextInput
              placeholder="Address line 1"
              placeholderTextColor={palette.muted}
              value={addressLine1}
              onChangeText={setAddressLine1}
              textContentType="streetAddressLine1"
              style={inputStyle}
            />
            <TextInput
              placeholder="Address line 2 (optional)"
              placeholderTextColor={palette.muted}
              value={addressLine2}
              onChangeText={setAddressLine2}
              textContentType="streetAddressLine2"
              style={inputStyle}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                placeholder="City"
                placeholderTextColor={palette.muted}
                value={addressCity}
                onChangeText={setAddressCity}
                textContentType="addressCity"
                style={[inputStyle, { flex: 2 }]}
              />
              <TextInput
                placeholder="State"
                placeholderTextColor={palette.muted}
                value={addressState}
                onChangeText={setAddressState}
                autoCapitalize="characters"
                textContentType="addressState"
                style={[inputStyle, { flex: 1 }]}
              />
              <TextInput
                placeholder="ZIP"
                placeholderTextColor={palette.muted}
                value={addressPostalCode}
                onChangeText={setAddressPostalCode}
                keyboardType="number-pad"
                textContentType="postalCode"
                style={[inputStyle, { flex: 1 }]}
              />
            </View>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <FieldLabel>What's it for?</FieldLabel>
          <TextInput
            placeholder="Gold sponsorship, Hackathon 2026"
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              if (error) setError("");
            }}
            style={inputStyle}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1, gap: 8 }}>
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
                placeholder="500.00"
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
          <View style={{ flex: 1, gap: 8 }}>
            <FieldLabel>Due date</FieldLabel>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.muted}
              value={dueDate}
              onChangeText={(v) => {
                setDueDate(v);
                if (error) setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>
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
          Send Invoice
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
