import { useState, useCallback } from "react";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertState {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
  });

  const showAlert = useCallback(
    (
      title?: string,
      message?: string,
      buttons?: AlertButton[],
      onDismiss?: () => void,
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons,
        onDismiss,
      });
    },
    [],
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const alert = useCallback(
    (
      title?: string,
      message?: string,
      buttons?: AlertButton[],
      onDismiss?: () => void,
    ) => {
      showAlert(title, message, buttons, onDismiss);
    },
    [showAlert],
  );

  return {
    alertState,
    showAlert,
    hideAlert,
    alert,
  };
};
