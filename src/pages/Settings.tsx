import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { setAlternateAppIcon, getAppIconName } from "expo-alternate-app-icons";
import { revokeAsync } from "expo-auth-session";
import Constants from "expo-constants";
import { PropsWithChildren, useContext, useEffect, useState } from "react";
import {
  Text,
  View,
  Image,
  Pressable,
  ScrollView,
  useColorScheme,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";

import AuthContext from "../auth";
import Button from "../components/Button";
import UserMention from "../components/UserMention";
import { TabParamList } from "../lib/NavigatorParamList";
import User from "../lib/types/User";
import { palette } from "../theme";

import { discovery } from "./login";

const IconComponent = ({
  name,
  displayName = name,
  currentIcon,
  last,
  onPress,
}: {
  name: string;
  displayName?: string;
  currentIcon: string;
  last?: boolean;
  onPress: (name: string) => void;
}) => {
  const selected = currentIcon === name;
  const { colors } = useTheme();
  const scheme = useColorScheme();

  const icons: { [key: string]: NodeRequire | null } = {
    default: require("../../assets/icons/default.png"),
    artskillz: require("../../assets/icons/art-skillz.png"),
    cashmoney: require("../../assets/icons/cash-money.png"),
    dev: require("../../assets/icons/dev.png"),
    testflight: Constants.platform?.ios
      ? require("../../assets/icons/testflight.png")
      : null,
    hacknight: Constants.platform?.ios
      ? require("../../assets/icons/hack-night.png")
      : null,
  };

  return (
    <Pressable onPress={() => onPress(name)}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          gap: 10,
        }}
      >
        <Image
          source={icons[name] || require("../../assets/icons/default.png")}
          style={{
            width: 50,
            height: 50,
            borderRadius: 10,
            borderColor: palette.muted,
            borderWidth: 0.5,
          }}
        />
        <Text
          style={{
            fontSize: 18,
            marginBottom: 0,
            color: colors.text,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {selected && (
          <Ionicons
            name={selected ? "checkmark-circle" : "checkmark-circle-outline"}
            size={24}
            color={selected ? palette.info : palette.muted}
            marginLeft="auto"
          />
        )}
      </View>
      {!last && (
        <View
          style={{
            height: 0.5,
            width: "100%",
            marginLeft: 60,
            backgroundColor: scheme == "dark" ? palette.slate : palette.smoke,
          }}
        ></View>
      )}
    </Pressable>
  );
};

const ListSection = ({ children }: PropsWithChildren) => {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        overflow: "hidden",
        paddingHorizontal: 10,
        marginBottom: 30,
      }}
    >
      {children}
    </View>
  );
};

const SectionHeader = ({ title }: { title: string }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: colors.text,
      }}
    >
      {title}
    </Text>
  );
};

const ListHeader = ({ title }: { title: string }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        fontSize: 18,
        marginBottom: 16,
        color: colors.text,
        marginLeft: 5,
      }}
    >
      {title}
    </Text>
  );
};

export default function SettingsPage(
  _props: BottomTabScreenProps<TabParamList, "Settings">,
) {
  const { mutate } = useSWRConfig();
  const { token, setToken } = useContext(AuthContext);
  const [appIcon, setIcon] = useState<string>("");

  useEffect(() => {
    let iconName = getAppIconName() || "default";
    iconName = iconName.toLowerCase()
    setIcon(iconName);
  }, []);

  const { data: user } = useSWR<User>("user");

  const handleClick = (iconName: string) => {
    const formattedIconName =
      iconName.charAt(0).toUpperCase() + iconName.slice(1);
    setAlternateAppIcon(formattedIconName.toString());
    setIcon(iconName);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 80 }}
      scrollIndicatorInsets={{ bottom: 80 }}
    >
      <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
        <SectionHeader title="App Icon" />
          <ListSection>
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="default"
              displayName="Classic"
            />
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="cashmoney"
              displayName="Cash Money"
            />
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="dev"
              displayName="Dev"
              last
            />
          </ListSection>
          <ListHeader title="Shiny- catchem all!" />
          <ListSection>
            {Constants.platform?.ios && (
              <>
                <IconComponent
                  onPress={handleClick}
                  currentIcon={appIcon}
                  name="hacknight"
                  displayName="Open Late"
                />
                <IconComponent
                  onPress={handleClick}
                  currentIcon={appIcon}
                  name="testflight"
                  displayName="Early Adopter"
                />
              </>
            )}
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="artskillz"
              displayName="Graphic Design Is My Passion"
              last
            />
          </ListSection>
        <View style={{ paddingTop: 12 }}>
          <SectionHeader title="Connected Account" />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Text style={{ textAlign: "center", color: palette.muted }}>
              Logged in as
            </Text>
            {user && <UserMention user={user} />}
          </View>
          <Button
            onPress={() => {
              // intentionally not `await`ed
              revokeAsync(
                {
                  token: token!,
                  clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
                },
                discovery,
              );

              mutate((k) => k, undefined, { revalidate: false });

              setToken("");
            }}
          >
            Log out
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
