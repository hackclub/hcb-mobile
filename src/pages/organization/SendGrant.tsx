import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Icon from "@thedev132/hackclub-icons-rn";
import { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Button as NativeButton,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSWRConfig } from "swr";

import AuthContext from "../../auth/auth";
import { getAccessToken } from "../../auth/tokenUtils";
import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import { useOffline } from "../../lib/useOffline";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";
import { renderMoney } from "../../utils/util";

type Props = NativeStackScreenProps<StackParamList, "SendGrant">;

export default function SendGrantPage({ navigation, route }: Props) {
  const { organization } = route.params as {
    organization: OrganizationExpanded;
  };

  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [oneTimeUse, setOneTimeUse] = useState(false);
  const [expirationDate, setExpirationDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { colors: themeColors } = useTheme();
  const { tokenResponse } = useContext(AuthContext);
  const accessToken = getAccessToken(tokenResponse);
  const { isOnline, withOfflineCheck } = useOffline();
  const isDark = useIsDark();
  const { mutate } = useSWRConfig();

  const emailRef = useRef<TextInput>(null);
  const purposeRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <>
          {Platform.OS === "android" ? (
            <View style={{ marginRight: 20 }}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={themeColors.text}
                onPress={() => navigation.goBack()}
              />
            </View>
          ) : (
            <NativeButton
              title="Cancel"
              color={themeColors.text}
              onPress={() => navigation.goBack()}
            />
          )}
        </>
      ),
    });
  }, [navigation, themeColors.text]);

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const parseAmount = (amountStr: string) => {
    const cleaned = amountStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  const validateInputs = () => {
    const numericAmount = parseAmount(amount);

    if (!email.trim()) {
      showAlert("Missing Email", "Please enter the recipient's email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (!validateEmail(email.trim())) {
      showAlert("Invalid Email", "Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (numericAmount <= 0) {
      showAlert("Invalid Amount", "Please enter an amount greater than $0.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (numericAmount * 100 > organization.balance_cents) {
      showAlert(
        "Insufficient Balance",
        `Your organization only has ${renderMoney(organization.balance_cents)} available.`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (expirationDate <= new Date()) {
      showAlert("Invalid Date", "Expiration date must be in the future.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    return true;
  };

  const handleSendGrant = withOfflineCheck(async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const amountCents = Math.round(parseAmount(amount) * 100);

      const response = await fetch(
        process.env.EXPO_PUBLIC_API_BASE + `/card_grants`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: organization.id,
            email: email.trim(),
            amount_cents: amountCents,
            expiration_at: expirationDate.toISOString(),
            purpose: purpose.trim() || undefined,
            invite_message: inviteMessage.trim() || undefined,
            one_time_use: oneTimeUse,
            sent_by_email: true,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.message ||
          errorData.error ||
          "Failed to send grant. Please try again.";

        // Check for common error cases
        if (
          errorMessage.toLowerCase().includes("not enabled") ||
          errorMessage.toLowerCase().includes("not available")
        ) {
          showAlert(
            "Grants Not Available",
            "Card grants are not enabled for this organization. Please contact HCB support to enable this feature.",
          );
        } else {
          showAlert("Error", errorMessage);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showAlert(
          "Grant Sent!",
          `A grant of ${renderMoney(Math.round(parseAmount(amount) * 100))} has been sent to ${email}. They'll receive an email to activate their grant card.`,
        );
        // Refresh organization data
        mutate(`organizations/${organization.id}`);
        mutate("user/organizations");
        // Navigate back after a short delay
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error) {
      console.error("Send grant operation failed", error, {
        context: {
          organizationId: organization.id,
          email: email,
          amount: amount,
          action: "send_grant",
        },
      });
      showAlert("Error", "An unexpected error occurred. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  });

  const onDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setExpirationDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmountInput = (text: string) => {
    // Remove all non-numeric characters except decimal
    const cleaned = text.replace(/[^0-9.]/g, "");
    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + "." + parts[1].slice(0, 2);
    }
    return cleaned;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1 }}>
            {/* From Organization */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              From
            </Text>
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Icon glyph="bank-account" size={24} color={palette.muted} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {organization.name}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 14 }}>
                  Balance: {renderMoney(organization.balance_cents)}
                </Text>
              </View>
            </View>

            {/* Recipient Email */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Recipient
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <Icon glyph="email" size={24} color={palette.muted} />
              <TextInput
                style={{
                  color: themeColors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  flex: 1,
                }}
                value={email}
                onChangeText={setEmail}
                placeholder="recipient@example.com"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => purposeRef.current?.focus()}
                ref={emailRef}
              />
            </View>

            {/* Amount */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Amount
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: palette.muted, fontSize: 20, fontWeight: "600" }}
              >
                $
              </Text>
              <TextInput
                style={{
                  color: themeColors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  fontSize: 20,
                  fontWeight: "600",
                  flex: 1,
                }}
                value={amount}
                onChangeText={(text) => setAmount(formatAmountInput(text))}
                placeholder="0.00"
                placeholderTextColor={palette.muted}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            {/* Expiration Date */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Expires On
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                marginBottom: 16,
              }}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Icon glyph="event-code" size={24} color={palette.muted} />
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 16,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                {formatDate(expirationDate)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.muted}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expirationDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
                themeVariant={isDark ? "dark" : "light"}
              />
            )}

            {/* Purpose */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Purpose (Optional)
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 8,
              }}
            >
              <Icon
                glyph="docs"
                size={24}
                color={palette.muted}
                style={{ marginTop: 14 }}
              />
              <TextInput
                style={{
                  color: themeColors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  flex: 1,
                  minHeight: 60,
                }}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="What should this grant be used for?"
                placeholderTextColor={palette.muted}
                multiline
                ref={purposeRef}
                returnKeyType="next"
                blurOnSubmit={true}
                onSubmitEditing={() => messageRef.current?.focus()}
              />
            </View>
            <Text
              style={{ color: palette.muted, fontSize: 13, marginBottom: 16 }}
            >
              The recipient will see this when they activate their grant.
            </Text>

            {/* Invite Message */}
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Personal Message (Optional)
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}
            >
              <Icon
                glyph="message"
                size={24}
                color={palette.muted}
                style={{ marginTop: 14 }}
              />
              <TextInput
                style={{
                  color: themeColors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  flex: 1,
                  minHeight: 80,
                }}
                value={inviteMessage}
                onChangeText={setInviteMessage}
                placeholder="Add a personal note to include in the email..."
                placeholderTextColor={palette.muted}
                multiline
                ref={messageRef}
              />
            </View>

            {/* One-Time Use Toggle */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.card,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                marginBottom: 24,
                gap: 12,
              }}
              onPress={() => setOneTimeUse(!oneTimeUse)}
              activeOpacity={0.7}
            >
              <Icon
                glyph={oneTimeUse ? "checkmark" : "checkbox"}
                size={26}
                color={oneTimeUse ? palette.primary : palette.muted}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  One-time use
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13 }}>
                  Card can only be charged once
                </Text>
              </View>
            </TouchableOpacity>

            {/* Send Button */}
            <Button
              onPress={handleSendGrant}
              loading={isLoading}
              disabled={!isOnline}
              icon="send"
              style={{
                width: "100%",
                marginBottom: 12,
              }}
            >
              Send Grant
            </Button>

            {!isOnline && (
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                You're offline. Connect to the internet to send grants.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
