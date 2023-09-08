import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  PlatformColor,
  Image,
  SafeAreaView,
  Button,
  StyleSheet,
} from "react-native";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import Ionicons from "@expo/vector-icons/Ionicons";
import { palette } from "../../theme";
import { renderMoney } from "../../util";
import Transaction from "../../components/Transaction";
import { useEffect } from "react";

export default function Organization({ route, navigation }) {
  const slug = route.params.id;

  const { data: organization } = useSWR(`/organizations/${slug}`);

  const { data, setSize, isValidating } = useSWRInfinite(
    (index, previousPageData) => {
      if (previousPageData?.has_more === false) return null;

      if (index === 0) return `/organizations/${slug}/transactions`;

      return `/organizations/${slug}/transactions?after=${
        previousPageData.data[previousPageData.data.length - 1].id
      }`;
    }
  );

  const transactions = data?.flatMap((d) => d.data);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      {transactions ? (
        <FlatList
          ListFooterComponent={() => isValidating && <ActivityIndicator />}
          onEndReachedThreshold={0.5}
          onEndReached={() => setSize((s) => s + 1)}
          ListHeaderComponent={() => (
            <View
              style={{
                paddingHorizontal: 20,
              }}
            >
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: PlatformColor("systemGray"),
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  Balance
                </Text>
                <Text style={{ color: "#fff", fontSize: 30 }}>
                  {renderMoney(organization.balance_cents)}
                </Text>
              </View>
              <View style={{ display: "flex" }}>
                <Text
                  style={{
                    color: PlatformColor("systemGray"),
                    fontSize: 12,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Transactions
                </Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={({ highlighted }) => (
            <View
              style={{
                height: 1,
                backgroundColor: PlatformColor("systemGray5"),
                marginHorizontal: 20,
              }}
            />
          )}
          data={transactions}
          style={{ flexGrow: 1 }}
          contentContainerStyle={{ paddingVertical: 20 }}
          renderItem={({ item, index }) => (
            <Transaction
              transaction={item}
              top={index == 0}
              bottom={index == transactions.length - 1}
            />
          )}
        />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
