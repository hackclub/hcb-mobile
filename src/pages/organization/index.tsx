import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import groupBy from "lodash/groupBy";
import { useMemo } from "react";
import { Text, View, ActivityIndicator, SectionList } from "react-native";
import useSWR from "swr";

import PlaygroundBanner from "../../components/organizations/PlaygroundBanner";
import Transaction from "../../components/Transaction";
import { StackParamList } from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import { OrganizationExpanded } from "../../lib/types/Organization";
import ITransaction from "../../lib/types/Transaction";
import { palette } from "../../theme";
import { renderMoney } from "../../util";

type Props = NativeStackScreenProps<StackParamList, "Event">;

export default function OrganizationPage({
  route: {
    params: { id: orgId },
  },
}: Props) {
  const { data: organization, isLoading: organizationLoading } =
    useSWR<OrganizationExpanded>(`/organizations/${orgId}`);
  const { transactions, isLoadingMore, loadMore, isLoading } =
    useTransactions(orgId);

  const tabBarSize = useBottomTabBarHeight();

  const sections: { title: string; data: ITransaction[] }[] = useMemo(
    () =>
      Object.entries(groupBy(transactions, "date")).map(([title, data]) => ({
        title,
        data,
      })),
    [transactions],
  );

  if (organizationLoading) {
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
      {organization !== undefined ? (
        <SectionList
          initialNumToRender={20}
          ListFooterComponent={() =>
            isLoadingMore &&
            !isLoading && <ActivityIndicator style={{ marginTop: 20 }} />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => loadMore()}
          ListHeaderComponent={() => (
            <View>
              {organization?.playground_mode && (
                <PlaygroundBanner organization={organization} />
              )}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: palette.muted,
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
              {/* <View style={{ display: "flex" }}>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 12,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Transactions
                </Text>
              </View> */}
              {isLoading && <ActivityIndicator />}
            </View>
          )}
          sections={sections}
          // stickySectionHeadersEnabled={false}
          style={{ flexGrow: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: tabBarSize + 20,
          }}
          scrollIndicatorInsets={{ bottom: tabBarSize }}
          renderSectionHeader={({ section: { title } }) => (
            <Text
              style={{
                color: palette.muted,
                backgroundColor: palette.background,
                paddingTop: 10,
                paddingBottom: 5,
                paddingHorizontal: 10,
                fontSize: 10,
              }}
            >
              {new Date(title).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC", // Prevent JS from doing timezone conversion
              })}
            </Text>
          )}
          renderItem={({ item, index, section: { data } }) => (
            <Transaction
              transaction={item}
              top={index == 0}
              bottom={index == data.length - 1}
            />
          )}
        />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
