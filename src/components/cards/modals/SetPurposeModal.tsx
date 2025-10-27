import { useTheme } from "@react-navigation/native";
import { Modal, View, Text, TextInput } from "react-native";

import Button from "../../Button";

interface SetPurposeModalProps {
  visible: boolean;
  onClose: () => void;
  onSetPurpose: () => void;
  purposeText: string;
  setPurposeText: (value: string) => void;
  isSettingPurpose: boolean;
}

export default function SetPurposeModal({
  visible,
  onClose,
  onSetPurpose,
  purposeText,
  setPurposeText,
  isSettingPurpose,
}: SetPurposeModalProps) {
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
            Set Grant Purpose
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              marginBottom: 8,
              fontWeight: "500",
            }}
          >
            Purpose
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
              minHeight: 80,
              textAlignVertical: "top",
            }}
            placeholder="Describe the purpose of this grant..."
            placeholderTextColor={themeColors.text + "80"}
            multiline
            numberOfLines={4}
            value={purposeText}
            onChangeText={setPurposeText}
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
                backgroundColor: "#50ECC0",
                borderRadius: 15,
                paddingVertical: 14,
              }}
              color="#114F3D"
              onPress={onSetPurpose}
              loading={isSettingPurpose}
            >
              Set Purpose
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
