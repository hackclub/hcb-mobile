import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { StackParamList } from "../../lib/NavigatorParamList";
import { useOffline } from "../../lib/useOffline";
import { palette } from "../../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "InviteUser">;

type Role = "member" | "manager" | "reader";

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "manager",
    label: "Manager",
    description: "Full access to manage the organization",
  },
  {
    value: "member",
    label: "Member",
    description: "Can make purchases and view transactions",
  },
  {
    value: "reader",
    label: "Reader",
    description: "Can only view transactions and balances",
  },
];

export default function InviteUserPage({
  navigation,
  route: {
    params: { orgId, orgName },
  },
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const { mutate } = useSWRConfig();
  const { isOnline, withOfflineCheck } = useOffline();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [enableSpendingControls, setEnableSpendingControls] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateInputs = () => {
    if (!email.trim()) {
      showAlert("Error", "Please enter an email address.");
      return false;
    }
    if (!validateEmail(email.trim())) {
      showAlert("Error", "Please enter a valid email address.");
      return false;
    }
    if (role === "member" && enableSpendingControls) {
      const amount = parseFloat(allowanceAmount.replace(/[^\d.]/g, ""));
      if (isNaN(amount) || amount <= 0) {
        showAlert(
          "Error",
          "Please enter a valid spending control allowance amount.",
        );
        return false;
      }
    }
    return true;
  };

  const handleInvite = withOfflineCheck(async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const body: {
        event_id: string;
        email: string;
        role: Role;
        enable_spending_controls?: boolean;
        initial_control_allowance_amount?: number;
      } = {
        event_id: orgId,
        email: email.trim(),
        role,
      };

      if (role === "member" && enableSpendingControls) {
        body.enable_spending_controls = true;
        const amountInCents = Math.round(
          parseFloat(allowanceAmount.replace(/[^\d.]/g, "")) * 100,
        );
        body.initial_control_allowance_amount = amountInCents;
      }

      const response = await hcb.post('user/invitations', { json: body });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          message?: string;
        };
        showAlert(
          "Error",
          errorData.error ||
            errorData.message ||
            "Failed to send invitation. Please try again.",
        );
      } else {
        showAlert("Success", `Invitation sent to ${email.trim()}`);
        mutate(`organizations/${orgId}?avatar_size=50`);
        navigation.goBack();
      }
    } catch (error) {
      console.error("Invite operation failed", error);
      showAlert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  });

  const formatAllowance = (text: string) => {
    const sanitizedText = text.replace(/[^\d.]/g, "");
    if (sanitizedText === "" || sanitizedText === ".") {
      return "";
    }
    return sanitizedText;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: themeColors.background }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="close" size={28} color={themeColors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: themeColors.text,
              flex: 1,
            }}
          >
            Invite to {orgName}
          </Text>
        </View>

        <Text
          style={{
            color: palette.muted,
            fontSize: 14,
            marginBottom: 28,
            lineHeight: 20,
          }}
        >
          Send an invitation to join your organization. They&apos;ll receive an
          email with a link to accept.
        </Text>

        {/* Email Input */}
        <Text
          style={{
            color: themeColors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
          }}
        >
          Email Address
        </Text>
        <TextInput
          style={{
            backgroundColor: themeColors.card,
            color: themeColors.text,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            marginBottom: 24,
          }}
          value={email}
          onChangeText={setEmail}
          placeholder="zach@hackclub.com"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        {/* Role Selection */}
        <Text
          style={{
            color: themeColors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 12,
          }}
        >
          Role
        </Text>
        <View style={{ marginBottom: 24, gap: 10 }}>
          {ROLES.map((roleOption) => (
            <TouchableOpacity
              key={roleOption.value}
              onPress={() => {
                setRole(roleOption.value);
                if (roleOption.value !== "member") {
                  setEnableSpendingControls(false);
                  setAllowanceAmount("");
                }
              }}
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 12,
                padding: 16,
                borderWidth: 2,
                borderColor:
                  role === roleOption.value ? palette.primary : "transparent",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    {roleOption.label}
                  </Text>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 14,
                    }}
                  >
                    {roleOption.description}
                  </Text>
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      role === roleOption.value
                        ? palette.primary
                        : palette.muted,
                    backgroundColor:
                      role === roleOption.value
                        ? palette.primary
                        : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {role === roleOption.value && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spending Controls Section - Only show for members */}
        {role === "member" && (
          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: enableSpendingControls ? 16 : 0,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 16,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Enable Spending Controls
                </Text>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 14,
                  }}
                >
                  Set a spending limit for this user
                </Text>
              </View>
              <Switch
                value={enableSpendingControls}
                onValueChange={setEnableSpendingControls}
                trackColor={{ false: palette.muted, true: palette.primary }}
                thumbColor={enableSpendingControls ? "#fff" : "#f4f3f4"}
              />
            </View>

            {enableSpendingControls && (
              <View>
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Initial Allowance Amount
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: themeColors.background,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.text,
                      fontSize: 18,
                      fontWeight: "600",
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      color: themeColors.text,
                      fontSize: 18,
                      padding: 14,
                      fontWeight: "500",
                    }}
                    value={allowanceAmount}
                    onChangeText={(text) =>
                      setAllowanceAmount(formatAllowance(text))
                    }
                    placeholder="0.00"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  This is the maximum amount this user can spend
                </Text>
              </View>
            )}
          </View>
        )}

        <Button
          onPress={handleInvite}
          loading={isLoading}
          disabled={!isOnline || !email.trim()}
          style={{
            marginTop: 8,
            opacity: !isOnline || !email.trim() ? 0.6 : 1,
          }}
        >
          Send Invitation
        </Button>

        {!isOnline && (
          <Text
            style={{
              color: palette.warning,
              fontSize: 14,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            You&apos;re offline. Connect to send invitations.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

