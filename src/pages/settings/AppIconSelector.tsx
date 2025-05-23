import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { setAlternateAppIcon, getAppIconName } from "expo-alternate-app-icons";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";

const icons: { [key: string]: number | null } = {
  default: require("../../../assets/icons/default.png"),
  artskillz: require("../../../assets/icons/art-skillz.png"),
  cashmoney: require("../../../assets/icons/cash-money.png"),
  dev: require("../../../assets/icons/dev.png"),
  testflight: Constants.platform?.ios
    ? require("../../../assets/icons/testflight.png")
    : null,
  hacknight: Constants.platform?.ios
    ? require("../../../assets/icons/hack-night.png")
    : null,
};

const iconList = Object.entries(icons)
  .filter(([, value]) => typeof value === "number")
  .map(([key, value]) => ({ key, value: value as number }));

export default function AppIconSelector() {
  const { colors } = useTheme();
  const [currentIcon, setCurrentIcon] = useState<string>("default");

  useEffect(() => {
    const iconName = getAppIconName() || "default";
    setCurrentIcon(iconName.toLowerCase());
  }, []);

  const handleSelect = (iconName: string) => {
    setAlternateAppIcon(iconName.charAt(0).toUpperCase() + iconName.slice(1));
    setCurrentIcon(iconName);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 14,
            marginTop: 10,
          }}
        >
          Choose App Icon
        </Text>
        <View style={{ gap: 12 }}>
          {iconList.map(({ key, value }) => (
            <Pressable
              key={key}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 2,
                borderColor:
                  currentIcon === key ? colors.primary : "transparent",
              }}
              onPress={() => handleSelect(key)}
            >
              <Image
                source={value}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  marginRight: 12,
                }}
              />
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              {currentIcon === key && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary}
                />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
