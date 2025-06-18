import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOffline } from "../lib/useOffline";
import { lightTheme, palette, theme } from "../utils/theme";

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <View
      style={{
        position: "absolute",
        zIndex: 999,
        width: "100%",
        alignItems: "center",
        pointerEvents: "none",
        top: insets.top + 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.dark
            ? palette.darkless
            : lightTheme.colors.card,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 20,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 6,
        }}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={18}
          color={palette.primary}
        />
        <Text
          style={{
            color: palette.primary,
            fontWeight: "bold",
            marginLeft: 8,
            fontSize: 15,
          }}
        >
          Offline Mode
        </Text>
      </View>
    </View>
  );
}
