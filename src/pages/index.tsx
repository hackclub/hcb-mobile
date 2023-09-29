import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useEffect } from "react";
import {
  FlatList,
  Text,
  View,
  ActivityIndicator,
  TouchableHighlight,
  ViewProps,
  StyleSheet,
  useColorScheme,
} from "react-native";
import useSWR, { preload, useSWRConfig } from "swr";

import { StackParamList } from "../lib/NavigatorParamList";
import Invitation from "../lib/types/Invitation";
import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import { palette } from "../theme";
import { renderMoney } from "../util";

function Event({
  event,
  hideBalance = false,
  onPress,
  style,
  invitation,
}: ViewProps & {
  event: Organization;
  hideBalance?: boolean;
  invitation?: Invitation;
  onPress?: () => void;
}) {
  const { data } = useSWR<OrganizationExpanded>(
    hideBalance ? null : `/organizations/${event.id}`,
  );

  const { colors: themeColors } = useTheme();

  const colors = [
    "#ec3750",
    "#ff8c37",
    "#f1c40f",
    "#33d6a6",
    "#5bc0de",
    "#338eda",
    "#a633d6",
  ];

  // Generate a deterministic color to use if the organization doesn't have an icon
  const color = colors[Math.floor(event.id.charCodeAt(4) % colors.length)];

  return (
    <TouchableHighlight
      onPress={onPress}
      underlayColor={themeColors.background}
      activeOpacity={0.7}
    >
      <View
        style={StyleSheet.compose(
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: themeColors.card,
            marginBottom: 16,
            padding: 16,
            borderRadius: 10,
            overflow: "hidden",
          },
          style,
        )}
      >
        {event.icon ? (
          <Image
            source={{ uri: event.icon }}
            cachePolicy="disk"
            style={{ width: 40, height: 40, borderRadius: 8, marginRight: 16 }}
          />
        ) : (
          <View
            style={{
              borderRadius: 8,
              width: 40,
              height: 40,
              backgroundColor: color,
              marginRight: 16,
            }}
          ></View>
        )}
        <View
          style={{
            flexDirection: "column",
            flex: 1,
          }}
        >
          {invitation && invitation.sender && (
            <Text style={{ color: palette.muted, marginBottom: 3 }}>
              <Text style={{ fontWeight: "600" }}>
                {invitation.sender.name}
              </Text>{" "}
              invited you to
            </Text>
          )}
          <Text
            numberOfLines={2}
            style={{
              color: themeColors.text,
              fontSize: 20,
              fontWeight: "600",
            }}
          >
            {event.name}
          </Text>
          {!hideBalance && (
            <Text style={{ color: palette.muted, fontSize: 16, marginTop: 5 }}>
              {data ? renderMoney(data.balance_cents) : "$ ..."}
            </Text>
          )}
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={24}
          color={palette.muted}
        />
      </View>
    </TouchableHighlight>
  );
}

type Props = NativeStackScreenProps<StackParamList, "Organizations">;

export default function App({ navigation }: Props) {
  const { data: organizations, error } = useSWR<Organization[]>(
    "/user/organizations",
  );
  const { data: invitations } = useSWR<Invitation[]>("/user/invitations");

  const { fetcher } = useSWRConfig();
  const tabBarHeight = useBottomTabBarHeight();
  const scheme = useColorScheme();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    preload("/user/cards", fetcher!);
  }, []);

  if (error) {
    return (
      <View>
        <Text style={{ color: "white" }}>{error.toString()}</Text>
      </View>
    );
  }

  if (organizations === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View>
      {organizations && (
        <FlatList
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: tabBarHeight,
          }}
          contentInsetAdjustmentBehavior="automatic"
          data={organizations}
          // refreshing={isValidating}
          // onRefresh={() => {
          //   mutate(
          //     (key: string) =>
          //       key?.startsWith("/organizations/") ||
          //       key == "/user/organizations",
          //   );
          // }}
          ListHeaderComponent={() =>
            invitations &&
            invitations.length > 0 && (
              <View
                style={{
                  marginVertical: 20,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 12,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Pending invitations
                </Text>
                {invitations.map((invitation) => (
                  <Event
                    key={invitation.id}
                    invitation={invitation}
                    style={{
                      borderWidth: 2,
                      borderColor:
                        scheme == "dark" ? palette.primary : palette.muted,
                    }}
                    event={invitation.organization}
                    onPress={() =>
                      navigation.navigate("Invitation", { invitation })
                    }
                    hideBalance
                  />
                  // <TouchableHighlight key={invitation.id}>
                  //   <Text
                  //     style={{
                  //       color: palette.smoke,
                  //       backgroundColor: palette.darkless,
                  //       padding: 10,
                  //       borderRadius: 10,
                  //       overflow: "hidden",
                  //     }}
                  //   >
                  //     {invitation.organization.name}
                  //   </Text>
                  // </TouchableHighlight>
                ))}
              </View>
            )
          }
          renderItem={({ item: organization }) => (
            <Event
              event={organization}
              onPress={() =>
                navigation.navigate("Event", {
                  organization,
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}
