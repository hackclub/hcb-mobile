import { Alert } from "react-native";

import * as Haptics from "./haptics";

export const validateFields = (
  organizationId: string,
  cardType: string,
  shippingName: string,
  addressLine1: string,
  city: string,
  stateProvince: string,
  zipCode: string,
) => {
  if (!organizationId) {
    Alert.alert("Error", "Please select an organization");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return false;
  }

  if (cardType === "plastic") {
    if (!shippingName.trim()) {
      Alert.alert("Error", "Please enter a shipping name");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    if (!addressLine1.trim()) {
      Alert.alert("Error", "Please enter an address");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    if (!city.trim()) {
      Alert.alert("Error", "Please enter a city");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    if (!stateProvince.trim()) {
      Alert.alert("Error", "Please enter a state/province");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    if (!zipCode.trim()) {
      Alert.alert("Error", "Please enter a ZIP code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  }

  return true;
};
