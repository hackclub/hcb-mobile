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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import useTransactions from "../../lib/organization/useTransactions";

export default function Organization({
  route: {
    params: { id: orgId },
  },
  navigation,
}) {
  const { data: organization } = useSWR(`/organizations/${orgId}`);
  const { transactions, isLoadingMore, loadMore, isLoading } =
    useTransactions(orgId);

  const tabBarSize = useBottomTabBarHeight();

  if (isLoading) {
    return <ActivityIndicator />;
  }

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
          ListFooterComponent={() =>
            isLoadingMore && (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            )
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => loadMore()}
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
          contentContainerStyle={{ paddingTop: 20, paddingBottom: tabBarSize }}
          scrollIndicatorInsets={{ bottom: tabBarSize }}
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
