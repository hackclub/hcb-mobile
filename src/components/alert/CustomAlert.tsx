import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

import { useIsDark } from "../../lib/useColorScheme";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const { width } = Dimensions.get("window");

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: "OK" }],
  onDismiss,
}) => {
  const isDark = useIsDark();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onDismiss?.();
  };

  const getButtonStyle = (style?: "default" | "cancel" | "destructive") => {
    switch (style) {
      case "destructive":
        return [styles.button, styles.destructiveButton];
      case "cancel":
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: "default" | "cancel" | "destructive") => {
    switch (style) {
      case "destructive":
        return [styles.buttonText, styles.destructiveText];
      case "cancel":
        return [styles.buttonText, styles.cancelText];
      default:
        return [styles.buttonText, styles.defaultText];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.alertContainer,
            { backgroundColor: isDark ? "#2c2c2e" : "#ffffff" },
          ]}
        >
          {title && (
            <Text
              style={[styles.title, { color: isDark ? "#ffffff" : "#000000" }]}
            >
              {title}
            </Text>
          )}
          {message && (
            <Text
              style={[
                styles.message,
                { color: isDark ? "#ffffff" : "#000000" },
              ]}
            >
              {message}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={getButtonStyle(button.style)}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text style={getButtonTextStyle(button.style)}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: width * 0.8,
    maxWidth: 300,
    borderRadius: 13,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  defaultButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  destructiveButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  defaultText: {
    color: "#ffffff",
  },
  cancelText: {
    color: "#ffffff",
  },
  destructiveText: {
    color: "#ffffff",
  },
});
