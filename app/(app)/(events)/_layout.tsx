import { Ionicons } from "@expo/vector-icons";
import { Text } from "components/Text";
import { Stack } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Navbar({ t }: { t: any }) {
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

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        header: (t) => <Navbar t={t} />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: "" }} />
      <Stack.Screen
        name="[id]/transactions"
        options={{ title: "Transactions" }}
      />
    </Stack>
  );
}
