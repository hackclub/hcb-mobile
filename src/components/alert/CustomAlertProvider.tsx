import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { Platform } from "react-native";

import { setGlobalCustomAlert } from "../../lib/alertUtils";
import { useCustomAlert } from "../../lib/useCustomAlert";

import { CustomAlert } from "./CustomAlert";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertContextType {
  alert: (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
    onDismiss?: () => void,
  ) => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | null>(null);

export const useCustomAlertContext = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error(
      "useCustomAlertContext must be used within a CustomAlertProvider",
    );
  }
  return context;
};

interface CustomAlertProviderProps {
  children: ReactNode;
}

export const CustomAlertProvider: React.FC<CustomAlertProviderProps> = ({
  children,
}) => {
  const { alertState, alert, hideAlert } = useCustomAlert();

  // Register the global alert function for Android
  useEffect(() => {
    if (Platform.OS === "android") {
      setGlobalCustomAlert(alert);
    }
  }, [alert]);

  // Only render the provider and alert on Android
  if (Platform.OS === "ios") {
    return <>{children}</>;
  }

  return (
    <CustomAlertContext.Provider value={{ alert }}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onDismiss={() => {
          alertState.onDismiss?.();
          hideAlert();
        }}
      />
    </CustomAlertContext.Provider>
  );
};
