import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import useSWRMutation from "swr/mutation";

import Button from "@/components/Button";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

function RoleToggle({
  value,
  onChange,
}: {
  value: "member" | "manager";
  onChange: (v: "member" | "manager") => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 10,
        backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        padding: 3,
      }}
    >
      {(["member", "manager"] as const).map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: value === r ? themeColors.card : "transparent",
          }}
        >
          <Text
            style={{
              fontWeight: value === r ? "600" : "400",
              color:
                value === r
                  ? r === "manager"
                    ? palette.warning
                    : palette.info
                  : palette.muted,
              fontSize: 14,
            }}
          >
            {r === "member" ? "Member" : "Manager"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

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

export default function InvitePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [spendingControls, setSpendingControls] = useState(false);
  const [initialAmount, setInitialAmount] = useState("0.00");
  const [amountError, setAmountError] = useState("");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (role === "member" && spendingControls) {
      const val = parseFloat(initialAmount);
      if (isNaN(val) || val < 0) {
        setAmountError("Enter a valid amount (0 or more).");
        valid = false;
      } else {
        setAmountError("");
      }
    } else {
      setAmountError("");
    }

    return valid;
  };

  const { trigger: sendInvite, isMutating } = useSWRMutation(
    `organizations/${id}/invitations`,
    async () => {
      const body: Record<string, unknown> = { email: email.trim(), role };
      if (role === "member" && spendingControls) {
        body.enable_spending_controls = true;
        const cents = Math.round(parseFloat(initialAmount) * 100);
        body.initial_control_allowance_amount = cents >= 0 ? cents : 0;
      }
      return hcb.post(`organizations/${id}/invitations`, { json: body }).json();
    },
    {
      onSuccess: () => router.back(),
      onError: async (err) => {
        showAlert("Failed to send invite", await parseApiError(err, "Please try again."));
      },
    },
  );

  const inputStyle = {
    backgroundColor: themeColors.card,
    color: themeColors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  } as const;

  const sectionStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 12,
    overflow: "hidden",
  } as const;

  const rowStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as const;

  const dividerStyle = {
    height: 1,
    backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    marginHorizontal: 16,
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
          <FieldLabel>Email</FieldLabel>
          <TextInput
            placeholder="teammate@example.com"
            placeholderTextColor={palette.muted}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError("");
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={[
              inputStyle,
              emailError
                ? { borderWidth: 1, borderColor: palette.primary }
                : undefined,
            ]}
          />
          {!!emailError && (
            <Text style={{ color: palette.primary, fontSize: 13 }}>
              {emailError}
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Role</FieldLabel>
          <RoleToggle value={role} onChange={setRole} />
        </View>

        {role === "member" && (
          <View style={{ gap: 8 }}>
            <FieldLabel>Spending Controls</FieldLabel>
            <View style={sectionStyle}>
              <View style={rowStyle}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontSize: 15,
                      fontWeight: "500",
                    }}
                  >
                    Enable spending controls
                  </Text>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Limit how much this member can spend
                  </Text>
                </View>
                <Switch
                  value={spendingControls}
                  onValueChange={(v) => {
                    setSpendingControls(v);
                    if (!v) setAmountError("");
                  }}
                />
              </View>

              {spendingControls && (
                <>
                  <View style={dividerStyle} />
                  {!!amountError && (
                    <Text
                      style={{
                        color: palette.primary,
                        fontSize: 13,
                        paddingHorizontal: 16,
                        paddingTop: 10,
                      }}
                    >
                      {amountError}
                    </Text>
                  )}
                  <View style={rowStyle}>
                    <Text
                      style={{
                        color: themeColors.text,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      Initial allowance
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(0,0,0,0.05)",
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: palette.muted,
                          fontSize: 15,
                          marginRight: 2,
                        }}
                      >
                        $
                      </Text>
                      <TextInput
                        placeholderTextColor={palette.muted}
                        value={initialAmount}
                        onChangeText={(v) => {
                          setInitialAmount(v);
                          if (amountError) setAmountError("");
                        }}
                        keyboardType="decimal-pad"
                        style={{
                          color: amountError
                            ? palette.primary
                            : themeColors.text,
                          fontSize: 15,
                          minWidth: 70,
                          textAlign: "right",
                        }}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        <Button
          variant="primary"
          icon="member-add"
          loading={isMutating}
          onPress={() => {
            if (validate()) sendInvite();
          }}
        >
          Send Invite
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
