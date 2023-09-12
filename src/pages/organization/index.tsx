import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  PlatformColor,
} from "react-native";
import useSWR from "swr";

import PlaygroundBanner from "../../components/organizations/PlaygroundBanner";
import Transaction from "../../components/Transaction";
import { StackParamList } from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import Organization from "../../lib/types/Organization";
import { renderMoney } from "../../util";

type Props = NativeStackScreenProps<StackParamList, "Event">;

export default function OrganizationPage({
  route: {
    params: { id: orgId },
  },
}: Props) {
  const { data: organization } = useSWR<Organization>(
    `/organizations/${orgId}`,
  );
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
      {organization && transactions ? (
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
              {organization?.playground_mode && (
                <PlaygroundBanner organization={organization} />
              )}
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
                  {renderMoney(organization.balance_cents!)}
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
          ItemSeparatorComponent={() => (
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
