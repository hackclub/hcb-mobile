import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "./Text";

export function Navbar({ t }: { t: any }) {
  const insets = useSafeAreaInsets();
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
      <Pressable onPress={() => t.navigation.goBack()} style={{ padding: 16 }}>
        <Ionicons name="chevron-back" size={24} color="black" />
      </Pressable>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginHorizontal: "auto",
          paddingRight: 50,
        }}
      >
        {t.options.title}
      </Text>
    </View>
  );
}
