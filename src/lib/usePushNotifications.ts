import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";

const EXPO_PUSH_TOKEN_KEY = "expo_push_token";
const NATIVE_PUSH_TOKEN_KEY = "native_push_token";

export interface PushTokens {
  expoPushToken: string | null;
  nativePushToken: string | null;
  nativePushTokenType: "ios" | "android" | null;
}

interface UsePushNotificationsResult {
  tokens: PushTokens;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  register: () => Promise<PushTokens>;
  clearTokens: () => Promise<void>;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(): UsePushNotificationsResult {
  const [tokens, setTokens] = useState<PushTokens>({
    expoPushToken: null,
    nativePushToken: null,
    nativePushTokenType: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);

  // Load stored tokens on mount
  useEffect(() => {
    const loadStoredTokens = async () => {
      try {
        const [storedExpoToken, storedNativeToken] = await Promise.all([
          SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          }),
          SecureStore.getItemAsync(NATIVE_PUSH_TOKEN_KEY, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          }),
        ]);

        if (storedExpoToken || storedNativeToken) {
          setTokens({
            expoPushToken: storedExpoToken,
            nativePushToken: storedNativeToken,
            nativePushTokenType: storedNativeToken
              ? Platform.OS === "ios"
                ? "ios"
                : "android"
              : null,
          });
        }
      } catch (err) {
        console.error("Failed to load stored push tokens:", err);
      }
    };

    loadStoredTokens();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EC3750",
      });
    }
  }, []);

  const register = useCallback(async (): Promise<PushTokens> => {
    setIsLoading(true);
    setError(null);

    const result: PushTokens = {
      expoPushToken: null,
      nativePushToken: null,
      nativePushTokenType: null,
    };

    try {
      //   if (!Device.isDevice) {
      //     setError("Push notifications require a physical device");
      //     setIsLoading(false);
      //     return result;
      //   }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== "granted") {
        setError("Push notification permission not granted");
        setIsLoading(false);
        return result;
      }

      try {
        const nativeTokenData = await Notifications.getDevicePushTokenAsync();
        result.nativePushToken = nativeTokenData.data;
        result.nativePushTokenType = nativeTokenData.type as "ios" | "android";
        console.log(
          `Native push token (${nativeTokenData.type}):`,
          nativeTokenData.data,
        );

        await SecureStore.setItemAsync(
          NATIVE_PUSH_TOKEN_KEY,
          nativeTokenData.data,
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
      } catch (nativeErr) {
        console.error("Failed to get native push token:", nativeErr);
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error("Missing EAS project ID for Expo push notifications");
      } else {
        try {
          const expoTokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
          });
          result.expoPushToken = expoTokenData.data;
          console.log("Expo push token:", expoTokenData.data);

          await SecureStore.setItemAsync(
            EXPO_PUSH_TOKEN_KEY,
            expoTokenData.data,
            {
              keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
            },
          );
        } catch (expoErr) {
          console.error("Failed to get Expo push token:", expoErr);
        }
      }

      setTokens(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Failed to register for push notifications:", err);
      setIsLoading(false);
      return result;
    }
  }, []);

  const clearTokens = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(EXPO_PUSH_TOKEN_KEY),
        SecureStore.deleteItemAsync(NATIVE_PUSH_TOKEN_KEY),
      ]);
      setTokens({
        expoPushToken: null,
        nativePushToken: null,
        nativePushTokenType: null,
      });
    } catch (err) {
      console.error("Failed to clear push tokens:", err);
    }
  }, []);

  return {
    tokens,
    isLoading,
    error,
    permissionStatus,
    register,
    clearTokens,
  };
}
