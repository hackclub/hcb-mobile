import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { setAlternateAppIcon, getAppIconName } from "expo-alternate-app-icons";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  useColorScheme,
} from "react-native";
import useSWR from "swr";

const icons: {
  [key: string]: number | { light: number; dark: number } | null;
} = {
  default: {
    light: require("../../../assets/app-icon.png"),
    dark: require("../../../assets/icons/default-dark.png"),
  },
  cashmoney: require("../../../assets/icons/cash-money.png"),
  testflight: Constants.platform?.ios
    ? require("../../../assets/icons/testflight.png")
    : null,
  hacknight: Constants.platform?.ios
    ? require("../../../assets/icons/hack-night.png")
    : null,
  admin: Constants.platform?.ios
    ? {
        light: require("../../../assets/icons/admin.png"),
        dark: require("../../../assets/icons/admin-dark.png"),
      }
    : null,
  platinum: Constants.platform?.ios
    ? require("../../../assets/icons/platinum.png")
    : null,
  hackathongrant: Constants.platform?.ios
    ? require("../../../assets/icons/hackathongrant.png")
    : null,
  christmas: Constants.platform?.ios
    ? require("../../../assets/icons/christmas.png")
    : null,
  frc: Constants.platform?.ios
    ? require("../../../assets/icons/frc.png")
    : null,
};

const iconKeyMap: { [key: string]: string } = {
  frc: "frc",
  admin: "admin",
  platinum: "platinum",
  testflight: "testflight",
  hackathon_grant: "hackathongrant",
};

const getDisplayName = (key: string) => {
  const nameMap: { [key: string]: string } = {
    hackathongrant: "Hackathon Grant",
    cashmoney: "Cash Money",
    christmas: "Christmas",
    frc: "FRC",
  };
  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const isChristmasSeason = () => {
  const now = new Date();
  const month = now.getMonth();
  return month === 11;
};

export default function AppIconSelector() {
  const { colors } = useTheme();
  const [currentIcon, setCurrentIcon] = useState<string>("default");
  const colorScheme = useColorScheme();
  const { data: availableIcons } = useSWR<Record<string, boolean>>(
    "user/available_icons",
  );

  useEffect(() => {
    const iconName = getAppIconName() || "default";
    setCurrentIcon(iconName.toLowerCase());
  }, []);

  const handleSelect = (iconName: string) => {
    setAlternateAppIcon(iconName.charAt(0).toUpperCase() + iconName.slice(1));
    setCurrentIcon(iconName);
  };

  const getIconSource = (value: number | { light: number; dark: number }) => {
    if (typeof value === "number") {
      return value;
    }
    return colorScheme === "dark" ? value.dark : value.light;
  };

  const getAvailableIcons = () => {
    if (!availableIcons) {
      return Object.entries(icons)
        .filter(([key, value]) => {
          if (value === null) return false;
          if (key === "christmas") return isChristmasSeason();
          return true;
        })
        .map(([key, value]) => ({
          key,
          value: value as number | { light: number; dark: number },
        }));
    }

    return Object.entries(icons)
      .filter(([key, value]) => {
        if (value === null) return false;
        if (key === "default") return true;
        if (key === "christmas") return isChristmasSeason();

        const apiKey = Object.entries(iconKeyMap).find(
          ([_, localKey]) => localKey === key,
        )?.[0];
        if (!apiKey) return true;
        return availableIcons[apiKey];
      })
      .map(([key, value]) => ({
        key,
        value: value as number | { light: number; dark: number },
      }));
  };

  const iconList = getAvailableIcons();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
    >
      <View style={{ gap: 12 }}>
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
                source={getIconSource(value)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  marginRight: 12,
                }}
              />
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>
                {getDisplayName(key)}
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
