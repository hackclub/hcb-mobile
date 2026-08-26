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
 * Reports an action that was attempted and failed outright.
 *
 * The convention this encodes: **success is a toast, failure is a modal.** A
 * success needs no decision, so it shouldn't block; a failure means the user's
 * intent did not happen, and a toast that auto-dismisses in a few seconds can
 * be missed entirely if they've looked away or navigated on. Pre-flight guards
 * (the offline warning in `lib/useOffline`) stay toasts — nothing was attempted,
 * so nothing failed.
 *
 * Pass `onRetry` only for work that is safe to repeat — re-running an upload or
 * a delete is fine; creating a card or burning one is not.
 */
export const showFailureAlert = (
  title: string,
  message: string,
  onRetry?: () => void,
) => {
  showAlert(
    title,
    message,
    onRetry
      ? [
          { text: "Dismiss", style: "cancel" },
          { text: "Retry", onPress: onRetry },
        ]
      : [{ text: "OK" }],
  );
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
