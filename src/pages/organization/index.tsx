import { Ionicons } from "@expo/vector-icons";
import { MenuAction, MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import groupBy from "lodash/groupBy";
import { useEffect, useMemo } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  SectionList,
  TouchableHighlight,
  useColorScheme,
} from "react-native";
import useSWR from "swr";

// import OrganizationTitle from "../../components/organizations/OrganizationTitle";
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
        missing_receipt: false,
      },
      ...transactions,
    ];
  } else {
    return transactions;
  }
}

export default function OrganizationPage({
  route: {
    params: { orgId, organization: _organization },
  },
  navigation,
}: Props) {
  const scheme = useColorScheme();
  const { data: organization, isLoading: organizationLoading } = useSWR<
    Organization | OrganizationExpanded
  >(`organizations/${orgId}`, { fallbackData: _organization });

  const { data: user, isLoading: userLoading } = useSWR("user");
  console.log(organization)
  const {
    transactions: _transactions,
    isLoadingMore,
    loadMore,
    isLoading,
  } = useTransactions(orgId);

  useEffect(() => {
    if (organization && user) {
      const isManager = "users" in organization &&
        organization.users.some(
          (u) => u.id === user?.id && u.role === "manager",
        );

      navigation.setOptions({
        title: organization.name,
        // headerTitle: () => <OrganizationTitle organization={organization} />,
      });

      const menuActions: MenuAction[] = [];
      if (
        "account_number" in organization &&
        organization.account_number !== null
      ) {
        menuActions.push({
          id: "accountNumber",
          title: "View Account Details",
          image: "creditcard.and.123",
        });
      }

      if (isManager) {
        menuActions.push({
          id: "transfer",
          title: "Transfer Money",
          image: "dollarsign.circle",
        });
      } 

      menuActions.push({
        id: "settings",
        title: "Manage Organization",
        image: "gearshape", 
      });


      navigation.setOptions({
        headerRight: () => (
          <MenuView
            actions={menuActions}
            themeVariant={scheme || undefined}
            onPressAction={({ nativeEvent: { event } }) => {
              if (event == "accountNumber") {
                navigation.navigate("AccountNumber", {
                  orgId: organization.id,
                });
              } else if (event == "settings") {
                navigation.navigate("OrganizationSettings", {
                  orgId: organization.id,
                });
              } else if (event == "transfer") {
                navigation.navigate("Transfer", { organization: organization });
              }
            }}
          >
            <Ionicons.Button
              name="ellipsis-horizontal-circle"
              backgroundColor="transparent"
              size={24}
              color={palette.primary}
              iconStyle={{ marginRight: 0 }}
            />
          </MenuView>
        ),
      });
    }
  }, [organization, scheme, navigation]);

  const tabBarSize = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  const transactions = useMemo(
    () => addPendingFeeToTransactions(_transactions, organization),
    [_transactions, organization],
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

  if (organizationLoading || userLoading) {
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
                {/* <Button
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
                </Button> */}
              </View>

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
                        transactionId: item.id!,
                        orgId,
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
