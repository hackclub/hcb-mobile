import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";

export function Navbar({
  options,
  navigation: _navigation,
}: {
  options: { title?: string };
  navigation: unknown;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingTop: insets.top,
        height: insets.top + 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
      }}
    >
      <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginHorizontal: "auto",
          paddingRight: 50,
        }}
      >
        {options?.title}
      </Text>
    </View>
  );
}
