import { StatusBar } from "expo-status-bar";
import {
  FlatList,
  Text,
  View,
  PlatformColor,
  ActivityIndicator,
  TouchableHighlight,
  SafeAreaView,
} from "react-native";
import { Image } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import { palette } from "../theme";
import { renderMoney } from "../util";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

function Event({ event, navigation }) {
  const { data } = useSWR(`/organizations/${event.id}`);

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
      onPress={() =>
        navigation.navigate("Event", {
          id: event.id,
          title: event.name,
          image: event.icon,
        })
      }
      underlayColor={palette.background}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.darkless,
          marginHorizontal: 20,
          marginVertical: 8,
          padding: 16,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {event.icon ? (
          <Image
            source={{ uri: event.icon }}
            width={40}
            height={40}
            style={{ borderRadius: 8, marginRight: 16 }}
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
          <Text
            numberOfLines={2}
            style={{
              color: "#fff",
              fontSize: 20,
              marginBottom: 5,
              fontWeight: "600",
            }}
          >
            {event.name}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 16 }}>
            {data ? renderMoney(data.balance_cents) : "$ ..."}
          </Text>
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

export default function App({ navigation }) {
  const { data: user } = useSWR("/user");

  const {
    data: organizations,
    error,
    isLoading,
  } = useSWR("/user/organizations");

  const { mutate } = useSWRConfig();
  const tabBarHeight = useBottomTabBarHeight();

  if (error) {
    return (
      <View>
        <Text style={{ color: "white" }}>{error.toString()}</Text>
      </View>
    );
  }

  if (!user || !organizations) {
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
          contentContainerStyle={{ paddingBottom: tabBarHeight }}
          contentInsetAdjustmentBehavior="automatic"
          data={organizations}
          refreshing={isLoading}
          onRefresh={() => {
            mutate(
              (key) =>
                key.startsWith("/organizations/") ||
                key == "/user/organizations"
            );
          }}
          renderItem={({ item }) => (
            <Event event={item} navigation={navigation} />
          )}
        />
      )}
    </View>
  );
}
