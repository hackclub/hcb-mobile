import { useTheme } from "@react-navigation/native";
import { Modal, View, TextInput } from "react-native";
import { Text } from "components/Text";

import Button from "../../Button";

interface TopupModalProps {
  visible: boolean;
  onClose: () => void;
  onTopup: () => void;
  topupAmount: string;
  setTopupAmount: (value: string) => void;
  isToppingUp: boolean;
}

export default function TopupModal({
  visible,
  onClose,
  onTopup,
  topupAmount,
  setTopupAmount,
  isToppingUp,
}: TopupModalProps) {
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
            Topup Grant
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              marginBottom: 8,
              fontWeight: "500",
            }}
          >
            Amount
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
            placeholder="500.00"
            placeholderTextColor={themeColors.text + "80"}
            keyboardType="decimal-pad"
            value={topupAmount}
            onChangeText={setTopupAmount}
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              style={{
                flex: 1,
                borderRadius: 15,
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              }}
              color={themeColors.text}
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button
              style={{
                flex: 1,
                backgroundColor: "#3499EE",
                borderRadius: 15,
                paddingVertical: 14,
              }}
              color="white"
              onPress={onTopup}
              loading={isToppingUp}
              disabled={!topupAmount || parseFloat(topupAmount) <= 0}
            >
              Topup
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
