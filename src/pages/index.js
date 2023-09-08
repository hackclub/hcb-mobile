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
            style={{ borderRadius: 8, marginRight: 10 }}
          />
        ) : (
          <View
            style={{
              borderRadius: 8,
              width: 40,
              height: 40,
              backgroundColor: color,
              marginRight: 10,
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
          {data && (
            <Text style={{ color: palette.muted, fontSize: 16 }}>
              {renderMoney(data.balance_cents)}
            </Text>
          )}
        </View>
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
          contentInsetAdjustmentBehavior="automatic"
          data={organizations}
          keyExtractor={(item) => item.id}
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
