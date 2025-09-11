import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { setAlternateAppIcon, getAppIconName } from "expo-alternate-app-icons";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import useSWR from "swr";

const icons: { [key: string]: number | null } = {
  default: require("../../../assets/icons/default.png"),
  "default dark": require("../../../assets/icons/default-dark.png"),
  cashmoney: require("../../../assets/icons/cash-money.png"),
  hacknight: Constants.platform?.ios
    ? require("../../../assets/icons/hack-night.png")
    : null,
  testflight: Constants.platform?.ios
    ? require("../../../assets/icons/testflight.png")
    : null,
  premium: Constants.platform?.ios
    ? require("../../../assets/icons/premium.png")
    : null,
  hackathongrant: Constants.platform?.ios
    ? require("../../../assets/icons/hackathongrant.png")
    : null,
  "admin light": Constants.platform?.ios
    ? require("../../../assets/icons/admin.png")
    : null,
  "admin dark": Constants.platform?.ios
    ? require("../../../assets/icons/admin-dark.png")
    : null,
  platinum: Constants.platform?.ios
    ? require("../../../assets/icons/platinum.png")
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
  admin: "admin light",
  platinum: "platinum",
  testflight: "testflight",
  hackathon_grant: "hackathongrant",
  premium: "premium",
};

const getDisplayName = (key: string) => {
  const nameMap: { [key: string]: string } = {
    default: "Default",
    "default dark": "Default Dark",
    hackathongrant: "Hackathon Grant",
    cashmoney: "Cash Money",
    christmas: "Christmas",
    frc: "FRC",
    "admin light": "Admin Light",
    "admin dark": "Admin Dark",
    platinum: "Platinum",
    testflight: "Testflight",
    hacknight: "Hacknight",
    premium: "Premium",
  };

  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const isChristmasSeason = () => {
  const now = new Date();
  const month = now.getMonth();
  return month === 11; // December
};

export default function AppIconSelector() {
  const { colors } = useTheme();
  const [currentIcon, setCurrentIcon] = useState<string>("default");
  const { data: availableIcons } = useSWR<Record<string, boolean>>(
    "user/available_icons",
  );

  useEffect(() => {
    const iconName = getAppIconName();

    if (!iconName || iconName === "Default") {
      setCurrentIcon("default");
    } else if (iconName === "DefaultDark") {
      setCurrentIcon("default dark");
    } else if (iconName === "Admin") {
      setCurrentIcon("admin light");
    } else if (iconName === "AdminDark") {
      setCurrentIcon("admin dark");
    } else {
      setCurrentIcon(iconName.toLowerCase());
    }
  }, []);

  const handleSelect = async (iconName: string) => {
    // Convert display name back to the format expected by expo-alternate-app-icons
    let configIconName: string | null = iconName;

    if (iconName === "default") {
      configIconName = null;
    } else if (iconName === "default dark") {
      configIconName = "DefaultDark";
    } else if (iconName === "admin light") {
      configIconName = "Admin";
    } else if (iconName === "admin dark") {
      configIconName = "AdminDark";
    } else {
      configIconName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    }

    try {
      await setAlternateAppIcon(configIconName);
      setCurrentIcon(iconName);
      console.log(`Successfully set icon to: ${configIconName}`);
    } catch (error) {
      console.error(`Failed to set icon:`, error);
    }
  };

  const getAvailableIcons = () => {
    if (!availableIcons) {
      return Object.entries(icons)
        .filter(([key, value]) => {
          if (value === null) return false;
          if (key === "christmas") return isChristmasSeason();
          if (key === "admin light" || key === "admin dark") return false;
          if (key === "premium") return false;
          return true;
        })
        .map(([key, value]) => ({
          key,
          value: value as number,
        }));
    }

    return Object.entries(icons)
      .filter(([key, value]) => {
        if (value === null) return false;
        if (key.startsWith("default")) return true;
        if (key === "christmas") return isChristmasSeason();

        if (key === "admin light" || key === "admin dark") {
          return availableIcons["admin"];
        }
        if (key === "premium") return availableIcons["premium"];

        if (key === "testflight") return availableIcons["testflight"];
        const mappedApiKey = Object.entries(iconKeyMap).find(
          ([_, localKey]) => localKey === key,
        )?.[0];

        if (!mappedApiKey) return true;
        return availableIcons[mappedApiKey];
      })
      .map(([key, value]) => ({
        key,
        value: value as number,
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
                source={value}
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
