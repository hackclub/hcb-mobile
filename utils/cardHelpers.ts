import { Alert } from "react-native";

import Card from "@/lib/types/Card";

import * as Haptics from "./haptics";

export function getCardName(card: Card | undefined, fallback = ""): string {
  if (!card) return "";
  if (card.name) return card.name;
  if (card.user?.name) {
    const nameParts = card.user.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastInitial =
      nameParts.length > 1 ? `${nameParts[1]?.charAt(0) || ""}` : "";
    return lastInitial
      ? `${firstName} ${lastInitial}'s Card`
      : `${firstName}'s Card`;
  }
  return fallback;
}

/** Show a validation error alert and trigger error haptics. */
function validationError(message: string): false {
  Alert.alert("Error", message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  return false;
}

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
    return validationError("Please select an organization");
  }

  if (cardType === "plastic") {
    if (!shippingName.trim())
      return validationError("Please enter a shipping name");
    if (!addressLine1.trim()) return validationError("Please enter an address");
    if (!city.trim()) return validationError("Please enter a city");
    if (!stateProvince.trim())
      return validationError("Please enter a state/province");
    if (!zipCode.trim()) return validationError("Please enter a ZIP code");
  }

  return true;
};
