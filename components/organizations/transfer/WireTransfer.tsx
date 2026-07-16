import { useActionSheet } from "@expo/react-native-action-sheet";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import {
  AttachField,
  FooterNote,
  FormField,
  FormSection,
  NoticeCallout,
  ReadOnlyField,
  SelectField,
  TransferSubmitButton,
} from "./TransferFormUI";

import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { consumePendingCountry } from "@/lib/countryPickerStore";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useOffline } from "@/lib/useOffline";
import {
  BIC_REGEX,
  IBAN_FORMATS,
  informationRequiredFor,
  POSTAL_CODE_FORMATS,
  WireCountryField,
  WIRE_COUNTRIES,
  WIRE_CURRENCIES,
} from "@/lib/wireCountryFields";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

type WireTransferScreenProps = {
  organization: OrganizationExpanded;
};

// Wire transfers have a $500 minimum on HCB.
const WIRE_MINIMUM_CENTS = 50000;

export default function WireTransferScreen({
  organization,
}: WireTransferScreenProps) {
  const { withOfflineCheck } = useOffline();
  const { showActionSheetWithOptions } = useActionSheet();
  const isDark = useIsDark();
  const hcb = useClient();

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bicCode, setBicCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentFor, setPaymentFor] = useState("");
  const [file, setFile] = useState<{ uri: string; fileName: string } | null>(
    null,
  );
  const [recipientInformation, setRecipientInformation] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const countryCode = recipientCountry.trim().toUpperCase();
  const isUS = countryCode === "US";
  const selectedCountry = WIRE_COUNTRIES.find((c) => c.code === countryCode);
  // Column requires different recipient details depending on the recipient's
  // bank country — e.g. a legal ID for BR/CO/IN, a local bank code for
  // AU/CA/MX, a purpose code for CN/AE/MY, etc.
  const countryFields = useMemo(
    () => (countryCode.length === 2 ? informationRequiredFor(countryCode) : []),
    [countryCode],
  );

  // When returning from the country-picker sheet, apply the chosen country.
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingCountry();
      if (pending) setRecipientCountry(pending);
    }, []),
  );

  const openCountryPicker = () => {
    router.push({
      pathname: "/(events)/[id]/transfers/select-country",
      params: { id: organization.id, selected: countryCode },
    });
  };

  const setRecipientInformationField = (key: string, value: string) => {
    setRecipientInformation((prev) => ({ ...prev, [key]: value }));
  };

  const pickCountryFieldOption = (field: WireCountryField) => {
    if (!field.options) return;
    const labels = Object.keys(field.options);
    const options = [...labels, "Cancel"];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: field.label,
      },
      (index) => {
        if (index !== undefined && index < labels.length && field.options) {
          setRecipientInformationField(field.key, field.options[labels[index]]);
        }
      },
    );
  };

  const pickFile = () => {
    showActionSheetWithOptions(
      {
        options: ["Take Photo", "Choose from Library", "Cancel"],
        cancelButtonIndex: 2,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: "Attach a receipt or invoice",
      },
      async (index) => {
        const result =
          index === 0
            ? await (async () => {
                const { status } =
                  await ImagePicker.requestCameraPermissionsAsync();
                if (status !== "granted") {
                  showAlert(
                    "Permission needed",
                    "Camera access is required to take photos.",
                  );
                  return null;
                }
                return ImagePicker.launchCameraAsync({
                  mediaTypes: ["images"],
                  quality: 0.85,
                });
              })()
            : index === 1
              ? await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  quality: 0.85,
                })
              : null;
        if (result && !result.canceled) {
          const asset = result.assets[0];
          setFile({
            uri: asset.uri,
            fileName: asset.fileName ?? "attachment.jpg",
          });
        }
      },
    );
  };

  const pickCurrency = () => {
    const options = [...WIRE_CURRENCIES, "Cancel"];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: "Select currency",
      },
      (index) => {
        if (index !== undefined && index < WIRE_CURRENCIES.length) {
          setCurrency(WIRE_CURRENCIES[index]);
        }
      },
    );
  };

  const validate = (): boolean => {
    if (!recipientName.trim()) {
      showAlert("Missing field", "Please enter the recipient's name.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      showAlert(
        "Invalid email",
        "Please enter a valid recipient email address.",
      );
      return false;
    }
    if (countryCode.length !== 2) {
      showAlert("Missing field", "Please select the recipient's bank country.");
      return false;
    }
    if (isUS) {
      showAlert(
        "Use ACH for domestic US transfers",
        "Domestic wires are not supported for transfers within the United States. Please send an ACH transfer instead.",
      );
      return false;
    }
    if (!accountNumber.trim()) {
      showAlert(
        "Missing field",
        "Please enter the recipient's account number or IBAN.",
      );
      return false;
    }
    if (
      IBAN_FORMATS[countryCode] &&
      !IBAN_FORMATS[countryCode].test(accountNumber.trim())
    ) {
      showAlert(
        "Invalid account number",
        "The account number / IBAN doesn't meet the required format for this country.",
      );
      return false;
    }
    if (!bicCode.trim()) {
      showAlert("Missing field", "Please enter the BIC / SWIFT code.");
      return false;
    }
    if (!BIC_REGEX.test(bicCode.trim().toUpperCase())) {
      showAlert(
        "Invalid BIC / SWIFT code",
        "Please enter a valid BIC / SWIFT code.",
      );
      return false;
    }
    if (!addressLine1.trim()) {
      showAlert("Missing field", "Please enter the recipient's address.");
      return false;
    }
    if (!city.trim()) {
      showAlert("Missing field", "Please enter the city.");
      return false;
    }
    if (
      POSTAL_CODE_FORMATS[countryCode] &&
      !POSTAL_CODE_FORMATS[countryCode].test(postalCode.trim())
    ) {
      showAlert(
        "Invalid postal code",
        "The postal code doesn't meet the required format for this country.",
      );
      return false;
    }
    for (const field of countryFields) {
      if (!recipientInformation[field.key]?.trim()) {
        showAlert("Missing field", `Please fill in "${field.label}".`);
        return false;
      }
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      showAlert(
        "Invalid amount",
        "Please enter a valid amount greater than 0.",
      );
      return false;
    }
    const amountCents = Math.round(parsed * 100);
    if (currency === "USD" && amountCents < WIRE_MINIMUM_CENTS) {
      showAlert(
        "Below minimum",
        `Wire transfers have a ${renderMoney(WIRE_MINIMUM_CENTS)} minimum.`,
      );
      return false;
    }
    if (currency === "USD" && amountCents > organization.balance_cents) {
      showAlert(
        "Insufficient balance",
        `This wire exceeds your available balance of ${renderMoney(organization.balance_cents)}.`,
      );
      return false;
    }
    if (!memo.trim()) {
      showAlert("Missing field", "Please enter a memo for the wire.");
      return false;
    }
    if (!paymentFor.trim()) {
      showAlert("Missing field", "Please describe what this wire is for.");
      return false;
    }
    return true;
  };

  const handleSubmit = withOfflineCheck(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("organization_id", organization.id);
      body.append("wire[recipient_name]", recipientName.trim());
      if (recipientEmail.trim()) {
        body.append("wire[recipient_email]", recipientEmail.trim());
      }
      body.append(
        "wire[recipient_country]",
        recipientCountry.trim().toUpperCase(),
      );
      body.append("wire[account_number]", accountNumber.trim());
      body.append("wire[bic_code]", bicCode.trim().toUpperCase());
      body.append("wire[address_line1]", addressLine1.trim());
      if (addressLine2.trim()) {
        body.append("wire[address_line2]", addressLine2.trim());
      }
      body.append("wire[address_city]", city.trim());
      if (state.trim()) {
        body.append("wire[address_state]", state.trim());
      }
      if (postalCode.trim()) {
        body.append("wire[address_postal_code]", postalCode.trim());
      }
      body.append("wire[currency]", currency);
      body.append(
        "wire[amount_cents]",
        String(Math.round(parseFloat(amount) * 100)),
      );
      body.append("wire[memo]", memo.trim());
      body.append("wire[payment_for]", paymentFor.trim());
      body.append("wire[send_email_notification]", "true");
      for (const field of countryFields) {
        const value = recipientInformation[field.key]?.trim();
        if (value) {
          body.append(`wire[${field.key}]`, value);
        }
      }

      if (file) {
        const compressed = await manipulateAsync(file.uri, [], {
          compress: 0.85,
          format: SaveFormat.JPEG,
        });
        body.append("wire[file]", {
          uri: compressed.uri,
          name: "attachment.jpeg",
          type: "image/jpeg",
        } as unknown as Blob);
      }

      await hcb.post("wires", { body }).json();
      showAlert(
        "Wire submitted",
        "Your wire transfer has been submitted and is pending approval.",
      );
      setRecipientName("");
      setRecipientEmail("");
      setRecipientCountry("");
      setAccountNumber("");
      setBicCode("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("");
      setPostalCode("");
      setCurrency("USD");
      setAmount("");
      setMemo("");
      setPaymentFor("");
      setFile(null);
      setRecipientInformation({});
    } catch (err) {
      console.error("Wire transfer failed", err, {
        context: { organizationId: organization.id, action: "wire_transfer" },
      });
      showAlert("Submission failed", await parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Stack.Screen
        options={{ headerLargeTitle: true, title: "Wire transfer" }}
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
            description="A confirmation is sent here once the wire is processed."
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <SelectField
            label="Recipient country"
            description="The country of the recipient's bank."
            value={selectedCountry?.name}
            placeholder="Select a country"
            onPress={openCountryPicker}
          />
        </FormSection>

        {isUS ? (
          <NoticeCallout
            title="Use ACH for domestic US transfers"
            color={palette.red}
            icon="close-circle-outline"
          >
            Domestic wires are not supported for transfers within the United
            States. Send an ACH transfer instead — it&apos;s the standard way to
            send money between banks in the US.
          </NoticeCallout>
        ) : null}

        <FormSection title="Bank details">
          <FormField
            label="Account number / IBAN"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="GB29 NWBK 6016 1331 9268 19"
            autoCapitalize="characters"
          />
          <FormField
            label="BIC / SWIFT code"
            description="The recipient bank's international identifier."
            value={bicCode}
            onChangeText={(t) =>
              setBicCode(
                t
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 11),
              )
            }
            placeholder="NWBKGB2L"
            autoCapitalize="characters"
            maxLength={11}
          />
        </FormSection>

        <FormSection title="Recipient address">
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
            placeholder="London"
            autoCapitalize="words"
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormField
                label="State / region"
                optional
                value={state}
                onChangeText={setState}
                placeholder="England"
                autoCapitalize="words"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Postal code"
                optional
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="EC1A 1BB"
                autoCapitalize="characters"
              />
            </View>
          </View>
        </FormSection>

        {countryFields.length > 0 ? (
          <FormSection title={`Additional details for ${countryCode}`}>
            {countryFields.map((field) =>
              field.type === "select" ? (
                <SelectField
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  value={
                    field.options &&
                    Object.keys(field.options).find(
                      (label) =>
                        field.options?.[label] ===
                        recipientInformation[field.key],
                    )
                  }
                  placeholder="Please select..."
                  onPress={() => pickCountryFieldOption(field)}
                />
              ) : (
                <FormField
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  value={recipientInformation[field.key] || ""}
                  onChangeText={(t) =>
                    setRecipientInformationField(field.key, t)
                  }
                  multiline={field.type === "textarea"}
                />
              ),
            )}
          </FormSection>
        ) : null}

        <FormSection title="Payment details">
          <SelectField
            label="Currency"
            value={currency}
            onPress={pickCurrency}
          />
          <FormField
            label="Amount"
            prefix={currency}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <FormField
            label="Memo"
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
          <AttachField
            label="Attach a receipt or invoice"
            description="Required for reimbursements / goods & services payments."
            fileName={file?.fileName}
            onPress={pickFile}
            onClear={() => setFile(null)}
          />
        </FormSection>

        <NoticeCallout
          title="Heads up!"
          footer="This requirement is waived for organizations that have raised over $50,000 in the past year and events on plans with exemptions—including Hack Club HQ! (admins can bypass this)"
        >
          Unfortunately, wires are expensive to send. Our partner bank charges
          us $25 per wire; therefore, to keep HCB sustainable without passing
          this fee onto you,{" "}
          <Text style={{ fontWeight: "700" }}>
            each wire sent must be at least $500
          </Text>{" "}
          (after conversion to USD).
        </NoticeCallout>

        <TransferSubmitButton
          loading={submitting}
          disabled={isUS}
          onPress={handleSubmit}
        >
          Send wire
        </TransferSubmitButton>

        <FooterNote>
          Your wire will be reviewed on the next business day.
        </FooterNote>
      </View>
    </>
  );
}
