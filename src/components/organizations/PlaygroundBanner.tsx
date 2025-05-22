import { useTheme } from "@react-navigation/native";
import { Text, View } from "react-native";

export default function PlaygroundBanner() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.primary,
        borderWidth: 2,
        borderStyle: "dotted",
        padding: 10,
        marginBottom: 20,
        borderRadius: 8,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{ color: colors.text, fontWeight: "bold", marginBottom: 5 }}
        >
          Playground Mode
        </Text>
        <Text style={{ color: colors.text, flex: 1, textAlign: "center" }}>
          To raise & spend money, wait for your organization&apos;s account to
          be activated by a staff member.
        </Text>
      </View>
    </View>
  );
}
