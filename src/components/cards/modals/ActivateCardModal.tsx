import { useTheme } from "@react-navigation/native";
import { Modal, View, Text, TextInput } from "react-native";

import { palette } from "../../../styles/theme";
import Button from "../../Button";

interface ActivateCardModalProps {
  visible: boolean;
  onClose: () => void;
  onActivate: () => void;
  last4: string;
  setLast4: (value: string) => void;
  activating: boolean;
}

export default function ActivateCardModal({
  visible,
  onClose,
  onActivate,
  last4,
  setLast4,
  activating,
}: ActivateCardModalProps) {
  const { colors: themeColors } = useTheme();

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
            borderRadius: 15,
            padding: 20,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: themeColors.text,
              marginBottom: 10,
            }}
          >
            Activate Physical Card
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              marginBottom: 20,
            }}
          >
            Please enter the last 4 digits of your card to activate it.
          </Text>
          <TextInput
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: themeColors.text,
              marginBottom: 20,
              fontFamily: "JetBrainsMono-Regular",
            }}
            placeholder="Last 4 digits"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            maxLength={4}
            value={last4}
            onChangeText={setLast4}
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              }}
              color={themeColors.text}
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button
              style={{ flex: 1 }}
              onPress={onActivate}
              loading={activating}
            >
              Activate
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
