import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { revokeAsync } from "expo-auth-session";
import { PropsWithChildren, useContext, useEffect, useState } from "react";
import { Text, View, Image, Pressable, ScrollView } from "react-native";
import AppIcon from "react-native-dynamic-app-icon";
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
  const source = { uri: `${name}-Icon-60x60` };
  const selected = currentIcon === name;

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
          source={source}
          style={{ width: 50, height: 50, borderRadius: 10 }}
        />
        <Text style={{ fontSize: 18, marginBottom: 0, color: palette.smoke }}>
          {displayName}
        </Text>
        <Ionicons
          name={selected ? "checkmark-circle" : "checkmark-circle-outline"}
          size={24}
          color={selected ? palette.info : palette.muted}
          marginLeft="auto"
        />
      </View>
      {!last && (
        <View
          style={{
            height: 0.5,
            width: "100%",
            marginLeft: 60,
            backgroundColor: palette.slate,
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
        marginBottom: 60,
      }}
    >
      {children}
    </View>
  );
};

const SectionHeader = ({ title }: { title: string }) => {
  return (
    <Text
      style={{
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: palette.smoke,
      }}
    >
      {title}
    </Text>
  );
};

const ListHeader = ({ title }: { title: string }) => {
  return (
    <Text
      style={{
        fontSize: 18,
        marginBottom: 16,
        color: palette.smoke,
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
  const [appIcon, setAppIcon] = useState<string>("");

  useEffect(() => {
    AppIcon.getIconName(({ iconName }) => {
      if (iconName == "default") iconName = "Default"; // don't hate me 'cause you ain't me
      setAppIcon(iconName);
    });
  }, []);

  const { data: user } = useSWR<User>("/user");

  const handleClick = (iconName: string) => {
    AppIcon.setAppIcon(iconName.toString());
    setAppIcon(iconName);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 80 }}
      scrollIndicatorInsets={{ bottom: 80 }}
    >
      <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
        <SectionHeader title="App Icon" />
        <View>
          <ListSection>
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="Default"
              displayName="Classic"
            />
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="Cash Money"
              last
            />
          </ListSection>
          <ListHeader title="Shiny- catchem all!" />
          <ListSection>
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="Open Late"
            />
            <IconComponent
              onPress={handleClick}
              currentIcon={appIcon}
              name="Art Skillz"
              displayName="Graphic Design Is My Passion"
              last
            />
          </ListSection>
        </View>
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
