import Checkbox from "expo-checkbox";
import { useTheme } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, View } from "react-native";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette, radii } from "@/styles/theme";

const CONDUCT_URL = "https://hackclub.com/conduct";
const ISSUING_TERMS_URL =
  "https://stripe.com/legal/issuing/celtic-authorized-user-terms";

interface GrantTermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree: () => void;
  organizationName: string;
  activating: boolean;
}

function TermRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
    >
      <Checkbox
        value={checked}
        onValueChange={onToggle}
        color={checked ? palette.primary : undefined}
        style={{ marginTop: 2, borderRadius: 4 }}
      />
      <Text
        style={{
          color: themeColors.text,
          fontSize: 14,
          lineHeight: 20,
          flex: 1,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export default function GrantTermsModal({
  visible,
  onClose,
  onAgree,
  organizationName,
  activating,
}: GrantTermsModalProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const [purposeChecked, setPurposeChecked] = useState(false);
  const [conductChecked, setConductChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      setPurposeChecked(false);
      setConductChecked(false);
      setTermsChecked(false);
    }
  }, [visible]);

  const allChecked = purposeChecked && conductChecked && termsChecked;

  const linkStyle = {
    color: palette.info,
    textDecorationLine: "underline" as const,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: cardBorderColor(isDark),
            padding: 20,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: themeColors.text,
              marginBottom: 8,
            }}
          >
            Activate your grant card
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: palette.muted,
              marginBottom: 20,
            }}
          >
            Before you can start spending, you need to agree to the Card Issuing
            Terms and pledge to use the card responsibly.
          </Text>

          <View style={{ gap: 16, marginBottom: 24 }}>
            <TermRow
              checked={purposeChecked}
              onToggle={() => setPurposeChecked((c) => !c)}
            >
              I will only use this card for the intended purpose and adhere to
              the instructions provided by {organizationName}
            </TermRow>
            <TermRow
              checked={conductChecked}
              onToggle={() => setConductChecked((c) => !c)}
            >
              I will abide by the{" "}
              <Text
                style={linkStyle}
                onPress={() => Linking.openURL(CONDUCT_URL)}
              >
                Code of Conduct
              </Text>{" "}
              and understand that fraudulent activity will result in a ban
            </TermRow>
            <TermRow
              checked={termsChecked}
              onToggle={() => setTermsChecked((c) => !c)}
            >
              I agree to the{" "}
              <Text
                style={linkStyle}
                onPress={() => Linking.openURL(ISSUING_TERMS_URL)}
              >
                Card Issuing Terms
              </Text>
            </TermRow>
          </View>

          <View style={{ gap: 10 }}>
            <Button
              onPress={onAgree}
              loading={activating}
              disabled={!allChecked}
            >
              Start spending
            </Button>
            <Button variant="ghost" onPress={onClose} disabled={activating}>
              Cancel
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
