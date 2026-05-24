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
      console.error(
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

/**
 * Extracts the first error message from an API error response.
 * The v4 API returns errors as `{ messages: string[] }`.
 * Falls back to the provided fallback string if parsing fails.
 */
export async function parseApiError(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): Promise<string> {
  if (error && typeof error === "object" && "response" in error) {
    try {
      const response = (error as { response: Response }).response;
      const data = (await response.json()) as { messages?: string[] };
      if (data.messages?.length) {
        return data.messages[0];
      }
    } catch {
      // JSON parsing failed, fall through to fallback
    }
  }
  return fallback;
}
