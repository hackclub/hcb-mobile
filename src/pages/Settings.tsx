import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { revokeAsync } from "expo-auth-session";
import { useContext } from "react";
import { Text, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";

import AuthContext from "../auth";
import Button from "../components/Button";
import UserMention from "../components/UserMention";
import { TabParamList } from "../lib/NavigatorParamList";
import User from "../lib/types/User";
import { palette } from "../theme";

import { discovery } from "./login";

export default function SettingsPage(
  _props: BottomTabScreenProps<TabParamList, "Settings">,
) {
  const { mutate } = useSWRConfig();
  const { token, setToken } = useContext(AuthContext);

  const { data: user } = useSWR<User>("/user");

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
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
  );
}
