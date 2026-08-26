import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Performs haptic feedback optimized for each platform.
 * On Android, uses the haptic engine (performAndroidHapticsAsync).
 * On iOS, uses the standard haptic APIs.
 */

export const impactAsync = async (style: Haptics.ImpactFeedbackStyle) => {
  if (Platform.OS === "android") {
    switch (style) {
      case Haptics.ImpactFeedbackStyle.Light:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Clock_Tick,
        );
      case Haptics.ImpactFeedbackStyle.Medium:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Context_Click,
        );
      case Haptics.ImpactFeedbackStyle.Heavy:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Keyboard_Press,
        );
      case Haptics.ImpactFeedbackStyle.Rigid:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Virtual_Key,
        );
      case Haptics.ImpactFeedbackStyle.Soft:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Segment_Frequent_Tick,
        );
      default:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Context_Click,
        );
    }
  }
  return Haptics.impactAsync(style);
};

export const notificationAsync = async (
  type: Haptics.NotificationFeedbackType,
) => {
  if (Platform.OS === "android") {
    switch (type) {
      case Haptics.NotificationFeedbackType.Success:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Confirm,
        );
      case Haptics.NotificationFeedbackType.Warning:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Reject,
        );
      case Haptics.NotificationFeedbackType.Error:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Reject,
        );
      default:
        return Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Context_Click,
        );
    }
  }
  return Haptics.notificationAsync(type);
};

export const selectionAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Segment_Tick,
    );
  }
  return Haptics.selectionAsync();
};

export const dragStartAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Drag_Start,
    );
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const longPressAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Long_Press,
    );
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export const toggleAsync = async (isOn: boolean) => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      isOn
        ? Haptics.AndroidHaptics.Toggle_On
        : Haptics.AndroidHaptics.Toggle_Off,
    );
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const gestureStartAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Gesture_Start,
    );
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const gestureEndAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Gesture_End,
    );
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const textHandleMoveAsync = async () => {
  if (Platform.OS === "android") {
    return Haptics.performAndroidHapticsAsync(
      Haptics.AndroidHaptics.Text_Handle_Move,
    );
  }
  return Haptics.selectionAsync();
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from "expo-haptics";
