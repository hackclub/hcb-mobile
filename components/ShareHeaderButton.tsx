import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Platform, Pressable, Share } from "react-native";

export function ShareHeaderButton({ url }: { url: string }) {
  const { colors: themeColors } = useTheme();

  return (
    <Pressable
      onPress={async () => {
        try {
          if (Platform.OS == "ios") {
            await Share.share({ url });
          } else {
            await Share.share({ message: url });
          }
        } catch (error) {
          console.error("Error sharing:", error);
        }
      }}
      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
      accessibilityLabel="Share"
      accessibilityRole="button"
    >
      <Ionicons name="share-outline" size={24} color={themeColors.text} />
    </Pressable>
  );
}
