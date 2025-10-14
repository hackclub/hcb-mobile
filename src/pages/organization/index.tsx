import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuAction, MenuView } from "@react-native-menu/menu";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import groupBy from "lodash/groupBy";
import { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  SectionList,
  TouchableHighlight,
  useColorScheme,
  Platform,
} from "react-native";
import { ALERT_TYPE, Dialog } from "react-native-alert-notification";
import { mutate } from "swr";

import Button from "../../components/Button";
import AccessDenied from "../../components/organizations/AccessDenied";
import { EmptyState } from "../../components/organizations/EmptyState";
import { LoadingSkeleton } from "../../components/organizations/LoadingSkeleton";
import OfflineNoData from "../../components/organizations/OfflineNoData";
import PlaygroundBanner from "../../components/organizations/PlaygroundBanner";
import TapToPayBanner from "../../components/organizations/TapToPayBanner";
import MockTransaction, {
  MockTransactionType,
} from "../../components/transaction/MockTransaction";
import Transaction from "../../components/transaction/Transaction";
import { logError } from "../../lib/errorUtils";
import { StackParamList } from "../../lib/NavigatorParamList";
import MockTransactionEngine from "../../lib/organization/useMockTransactionEngine";
import useTransactions from "../../lib/organization/useTransactions";
import { getTransactionTitle } from "../../lib/transactionTitle";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import ITransaction, {
  TransactionType,
  TransactionWithoutId,
} from "../../lib/types/Transaction";
import User from "../../lib/types/User";
import { useOffline } from "../../lib/useOffline";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { useStripeTerminalInit } from "../../lib/useStripeTerminalInit";
import { palette } from "../../styles/theme";
import { renderDate, renderMoney } from "../../utils/util";
import { useIsDark } from "../../lib/useColorScheme";

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
  const { isOnline } = useOffline();
  const isDark = useIsDark();
  
  const {
    data: organization,
    error: organizationError,
    isLoading: organizationLoading,
    mutate: mutateOrganization,
  } = useOfflineSWR<Organization | OrganizationExpanded>(
    `organizations/${orgId}`,
    {
      fallbackData: _organization,
      onError: (err) => {
        logError("Error fetching organization:", err, {
          context: { orgId, isOnline },
        });
      },
    },
  );

  const { data: user, isLoading: userLoading } = useOfflineSWR<User>("user");
  const [showMockData, setShowMockData] = useState(false);
  const [showTapToPayBanner, setShowTapToPayBanner] = useState(false);
  const { supportsTapToPay } = useStripeTerminalInit({
    organizationId: organization?.id,
    enabled: !!(organization && !organization.playground_mode),
  });
  const userinOrganization = useMemo(() => {
    return organization && "users" in organization && organization.users.some((u) => u.id === user?.id);
  }, [organization, user]);

  const {
    transactions: _transactions,
    isLoadingMore,
    loadMore,
    isLoading,
  } = useTransactions(orgId);
  const [refreshing] = useState(false);

  useEffect(() => {
    const isAccessDenied =
      organizationError &&
      typeof organizationError === "object" &&
      "status" in organizationError &&
      organizationError.status === 403;

    const isOfflineNoData = organizationError && !isOnline && !organization;

    if (isAccessDenied) {
      navigation.setOptions({
        title: "Access Denied",
      });
    } else if (isOfflineNoData) {
      navigation.setOptions({
        title: "Offline",
      });
    } else if (organization) {
      navigation.setOptions({
        title: organization.name || "Organization",
      });
    }
  }, [organizationError, organization, navigation, isOnline]);

  useEffect(() => {
    const checkTapToPayBanner = async () => {
      try {
        const hasSeenBanner = await AsyncStorage.getItem(
          "hasSeenTapToPayBanner",
        );
        if (!hasSeenBanner && supportsTapToPay && Platform.OS === "ios") {
          setShowTapToPayBanner(true);
        }
      } catch (error) {
        logError("Error checking tap to pay banner status", error, {
          context: { action: "check_ttp_banner" },
        });
      }
    };
    checkTapToPayBanner();
  }, [supportsTapToPay]);

  // Terminal initialization is now handled by the useStripeTerminalInit hook

  const handleDismissTapToPayBanner = async () => {
    try {
      await AsyncStorage.setItem("hasSeenTapToPayBanner", "true");
      setShowTapToPayBanner(false);
    } catch (error) {
      logError("Error saving tap to pay banner dismiss status", error, {
        context: { action: "dismiss_ttp_banner" },
      });
      // Still hide the banner even if saving fails
      setShowTapToPayBanner(false);
    }
  };

  useEffect(() => {
    if (organization && user) {
      const isManager =
        "users" in organization &&
        organization.users.some(
          (u) => u.id === user?.id && u.role === "manager",
        );

      navigation.setOptions({
        title: organization.name,
        // headerTitle: () => <OrganizationTitle organization={organization} />,
      });

      const menuActions: MenuAction[] = [];

      if (
        "users" in organization &&
        organization.users.some((u) => u.id === user?.id)
      ) {
        if (
          "account_number" in organization &&
          organization.account_number !== null
        ) {
          menuActions.push({
            id: "accountNumber",
            title: "Account Details",
            image: "creditcard.and.123",
            imageColor: isDark ? "black" : "white",
          });
        }

        if (isManager && !organization.playground_mode) {
          menuActions.push({
            id: "transfer",
            title: "Transfer Money",
            image: "dollarsign.circle",
            imageColor: isDark ? "black" : "white",
          });
        }

        menuActions.push({
          id: "team",
          title: "Manage Team",
          image: "person.2.badge.gearshape",
          imageColor: isDark ? "black" : "white",
        });

        if (!organization.playground_mode && supportsTapToPay) {
          menuActions.push({
            id: "donation",
            title: "Collect Donations",
            image: "dollarsign.circle",
            imageColor: isDark ? "black" : "white",
          });
        }

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
                } else if (event == "team") {
                  navigation.navigate("OrganizationTeam", {
                    orgId: organization.id,
                  });
                } else if (event == "donation") {
                  if (supportsTapToPay) {
                    navigation.navigate("OrganizationDonation", {
                      orgId: organization.id,
                    });
                  } else {
                    Dialog.show({
                      type: ALERT_TYPE.DANGER,
                      title: "Unsupported Device",
                      textBody:
                        "Collecting donations is only supported on iOS 16.4 and later. Please update your device to use this feature.",
                      button: "Ok",
                    });
                  }
                } else if (event == "transfer") {
                  navigation.navigate("Transfer", {
                    organization: organization,
                  });
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
    }
  }, [organization, scheme, navigation, user, supportsTapToPay]);

  useEffect(() => {
    if (
      organizationError &&
      typeof organizationError === "object" &&
      "status" in organizationError &&
      organizationError.status === 401
    ) {
      mutateOrganization();
    }
  }, [organizationError, mutateOrganization]);

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
          t?.pending ? "Pending" : renderDate(t?.date),
        ),
      ).map(([title, data]) => ({
        title,
        data,
      })),
    [transactions],
  );

  const mock = new MockTransactionEngine();
  const mockTransactions = mock.generateMockTransactionList();
  const mockSections: { title: string; data: MockTransactionType[] }[] =
    useMemo(() => {
      return Object.entries(groupBy(mockTransactions, (t) => t.date))
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([title, data]) => ({
          title: renderDate(title),
          data,
        }));
    }, [mockTransactions]);

  const onRefresh = () => {
    if (isOnline) {
      mutate(`organizations/${orgId}`);
      mutate(`organizations/${orgId}/transactions`);
    }
  };

  if (
    organizationLoading ||
    userLoading ||
    (organizationError &&
      typeof organizationError === "object" &&
      "status" in organizationError &&
      organizationError.status === 403)
  ) {
    return <LoadingSkeleton />;
  }

  // Check for 403 access denied error
  const isAccessDenied =
    organizationError &&
    typeof organizationError === "object" &&
    "status" in organizationError &&
    organizationError.status === 403;

  // Check for offline with no cached data
  const isOfflineNoData = organizationError && !isOnline && !organization;

  if (isAccessDenied) {
    return <AccessDenied orgId={orgId} onGoBack={() => navigation.goBack()} />;
  }

  if (isOfflineNoData) {
    return (
      <OfflineNoData
        onRetry={() => {
          if (isOnline) {
            mutateOrganization();
          }
        }}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {organization !== undefined ? (
        <SectionList
          initialNumToRender={20}
          ListFooterComponent={() =>
            isLoadingMore && !isLoading && !organization.playground_mode ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            ) : null
          }
          onEndReachedThreshold={0.2}
          onEndReached={() => loadMore()}
          refreshing={refreshing}
          onRefresh={() => onRefresh()}
          ListHeaderComponent={() => (
            <View>
              {showTapToPayBanner && (
                <TapToPayBanner
                  onDismiss={handleDismissTapToPayBanner}
                  orgId={orgId}
                />
              )}
              {organization?.playground_mode && <PlaygroundBanner />}
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
                {organization?.playground_mode && (
                  <Button
                    style={{
                      backgroundColor: "#3F9CEE",
                      borderTopWidth: 0,
                    }}
                    color="#fff"
                    onPress={() => setShowMockData((prev) => !prev)}
                  >
                    {showMockData ? "Hide Mock Data" : "Show Mock Data"}
                  </Button>
                )}
              </View>

              {isLoading && <LoadingSkeleton />}
              {!isLoading && sections.length === 0 && !showMockData && (
                <EmptyState isOnline={isOnline} />
              )}
            </View>
          )}
          // @ts-expect-error workaround for mock data
          sections={
            organization?.playground_mode && showMockData
              ? (mockSections as unknown)
              : sections
          }
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
          renderItem={({ item, index, section: { data } }) =>
            organization?.playground_mode ? (
              <MockTransaction
                transaction={item}
                top={index == 0}
                bottom={index == data.length - 1}
              />
            ) : (
              <TouchableHighlight
                onPress={
                  item.id &&
                  (userinOrganization || user?.admin || user?.auditor)
                    ? () => {
                        if (
                          item.code === TransactionType.Disbursement &&
                          "transfer" in item &&
                          item.transfer?.card_grant_id
                        ) {
                          navigation.navigate("GrantCard", {
                            grantId: item.transfer.card_grant_id,
                          });
                        } else {
                          navigation.navigate("Transaction", {
                            transactionId: item.id!,
                            orgId,
                            transaction: item as ITransaction,
                            title: getTransactionTitle(item as ITransaction),
                          });
                        }
                      }
                    : undefined
                }
                underlayColor={themeColors.background}
                activeOpacity={0.7}
              >
                <Transaction
                  orgId={orgId}
                  transaction={item}
                  top={index == 0}
                  bottom={index == data.length - 1}
                />
              </TouchableHighlight>
            )
          }
        />
      ) : (
        <LoadingSkeleton />
      )}
    </View>
  );
}
