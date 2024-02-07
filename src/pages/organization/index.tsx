import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import groupBy from "lodash/groupBy";
import { useMemo } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  SectionList,
  TouchableHighlight,
} from "react-native";
import useSWR from "swr";

import Button from "../../components/Button";
import PlaygroundBanner from "../../components/organizations/PlaygroundBanner";
import Transaction from "../../components/Transaction";
import { StackParamList } from "../../lib/NavigatorParamList";
import useTransactions from "../../lib/organization/useTransactions";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import ITransaction, {
  TransactionType,
  TransactionWithoutId,
} from "../../lib/types/Transaction";
import { palette } from "../../theme";
import { renderDate, renderMoney } from "../../util";

type Props = NativeStackScreenProps<StackParamList, "Event">;

function addPendingFeeToTransactions(
  transactions: ITransaction[],
  organization: Organization | OrganizationExpanded | undefined,
): TransactionWithoutId[] {
  if (
    transactions.length > 0 &&
    organization &&
    "fee_balance_cents" in organization &&
    organization.fee_balance_cents > 0
  ) {
    return [
      {
        amount_cents: -organization.fee_balance_cents,
        code: TransactionType.BankFee,
        date: "",
        pending: true,
        memo: "FISCAL SPONSORSHIP",
        has_custom_memo: false,
        declined: false,
      },
      ...transactions,
    ];
  } else {
    return transactions;
  }
}

export default function OrganizationPage({
  route: {
    params: { organization: _organization },
  },
  navigation,
}: Props) {
  const { data: organization, isLoading: organizationLoading } = useSWR<
    Organization | OrganizationExpanded
  >(`/organizations/${_organization.id}`, { fallbackData: _organization });
  const {
    transactions: _transactions,
    isLoadingMore,
    loadMore,
    isLoading,
  } = useTransactions(_organization.id);

  const tabBarSize = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  const transactions = useMemo(
    () => addPendingFeeToTransactions(_transactions, organization),
    [_transactions],
  );

  const sections: { title: string; data: TransactionWithoutId[] }[] = useMemo(
    () =>
      Object.entries(
        groupBy(transactions, (t) =>
          t.pending ? "Pending" : renderDate(t.date),
        ),
      ).map(([title, data]) => ({
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
          initialNumToRender={30}
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
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  marginBottom: 32,
                  gap: 10,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    Balance
                  </Text>
                  <Text style={{ color: themeColors.text, fontSize: 36 }}>
                    {"balance_cents" in organization &&
                      renderMoney(organization.balance_cents)}
                  </Text>
                </View>
                <Button
                  style={{
                    backgroundColor: "#5bc0de",
                    borderTopWidth: 0,
                  }}
                  color="#186177"
                  disabled={organization.playground_mode}
                  onPress={() =>
                    navigation.navigate("Transfer", { organization })
                  }
                >
                  Transfer Money
                </Button>
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
                backgroundColor: themeColors.background,
                paddingTop: 10,
                paddingBottom: 5,
                paddingHorizontal: 10,
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              {title}
            </Text>
          )}
          renderItem={({ item, index, section: { data } }) => (
            <TouchableHighlight
              onPress={
                item.id
                  ? () => {
                      navigation.navigate("Transaction", {
                        orgId: _organization.id,
                        transaction: item as ITransaction,
                      });
                    }
                  : undefined
              }
              underlayColor={themeColors.background}
              activeOpacity={0.7}
            >
              <Transaction
                transaction={item}
                top={index == 0}
                bottom={index == data.length - 1}
              />
            </TouchableHighlight>
          )}
        />
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
