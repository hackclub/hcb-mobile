import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { showTapToPayEducation } from "expo-ttp-edu";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

export default function Tutorials() {
  const { colors } = useTheme();

  const handleTapToPayEducation = async () => {
    await showTapToPayEducation();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 32 }}
    >
      <View style={{ width: "100%" }}>
        <TouchableOpacity
          onPress={handleTapToPayEducation}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
            width: "100%",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Ionicons
              name="card-outline"
              size={22}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{ fontSize: 18, color: colors.text, fontWeight: "600" }}
            >
              Learn how to use Tap to Pay
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              color: colors.text,
              marginBottom: 0,
              textAlign: "left",
            }}
          >
            Discover how to accept payments quickly and securely using your
            device. Step-by-step instructions and tips included.
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
