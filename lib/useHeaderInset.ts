import { useHeaderHeight } from "expo-router/react-navigation";
import { Platform } from "react-native";

/**
 * Top inset needed to keep scroll content clear of a transparent navigation
 * header on Android.
 *
 * On iOS, `contentInsetAdjustmentBehavior="automatic"` offsets scroll content
 * below the (transparent) large-title header automatically. That prop is a
 * no-op on Android, so content slides under the header and status bar. Add the
 * returned value to a scroll container's top content padding to fix this; it is
 * `0` on iOS so the native behavior is left untouched.
 */
export function useHeaderInset(): number {
  const headerHeight = useHeaderHeight();
  return Platform.OS === "android" ? headerHeight : 0;
}
