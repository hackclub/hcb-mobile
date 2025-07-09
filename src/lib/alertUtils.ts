import { Alert, Platform } from "react-native";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export const showAlert = (
  title?: string,
  message?: string,
  buttons?: AlertButton[],
  onDismiss?: () => void,
) => {
  if (Platform.OS === "ios") {
    Alert.alert(title || "", message || "", buttons, { cancelable: true });
  } else {
    showAlertUniversal(title, message, buttons, onDismiss);
  }
};

let globalCustomAlert:
  | ((
      title?: string,
      message?: string,
      buttons?: AlertButton[],
      onDismiss?: () => void,
    ) => void)
  | null = null;

export const setGlobalCustomAlert = (
  alertFn: (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
    onDismiss?: () => void,
  ) => void,
) => {
  globalCustomAlert = alertFn;
};

export const showAlertUniversal = (
  title?: string,
  message?: string,
  buttons?: AlertButton[],
  onDismiss?: () => void,
) => {
  if (Platform.OS === "ios") {
    Alert.alert(title || "", message || "", buttons, { cancelable: true });
  } else {
    if (globalCustomAlert) {
      globalCustomAlert(title, message, buttons, onDismiss);
    } else {
      console.warn(
        "Custom alert not available. Make sure CustomAlertProvider is set up.",
      );
    }
  }
};

export const showOKAlert = (title: string, message?: string) => {
  showAlertUniversal(title, message, [{ text: "OK" }]);
};

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
) => {
  showAlertUniversal(title, message, [
    { text: "Cancel", style: "cancel", onPress: onCancel },
    { text: "OK", onPress: onConfirm },
  ]);
};

export const showDestructiveAlert = (
  title: string,
  message: string,
  destructiveText: string,
  onConfirm: () => void,
  onCancel?: () => void,
) => {
  showAlertUniversal(title, message, [
    { text: "Cancel", style: "cancel", onPress: onCancel },
    { text: destructiveText, style: "destructive", onPress: onConfirm },
  ]);
};
