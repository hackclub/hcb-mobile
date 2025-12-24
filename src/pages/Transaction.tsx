import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Linking,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
  TouchableOpacity,
} from "react-native";
import { mutate, useSWRConfig } from "swr";
import { match, P } from "ts-pattern";

import AdminTools from "../components/AdminTools";
import Comment from "../components/transaction/Comment";
import CommentField from "../components/transaction/comment/CommentField";
import TransactionSkeleton from "../components/transaction/TransactionSkeleton";
import AchTransferTransaction from "../components/transaction/types/AchTransferTransaction";
import BankAccountTransaction from "../components/transaction/types/BankAccountTransaction";
import BankFeeTransaction from "../components/transaction/types/BankFeeTransaction";
import CardChargeTransaction from "../components/transaction/types/CardChargeTransaction";
import CheckDepositTransaction from "../components/transaction/types/CheckDepositTransaction";
import CheckTransaction from "../components/transaction/types/CheckTransaction";
import DonationTransaction from "../components/transaction/types/DonationTransaction";
import ExpensePayoutTransaction from "../components/transaction/types/ExpensePayoutTransaction";
import InvoiceTransaction from "../components/transaction/types/InvoiceTransaction";
import { TransactionViewProps } from "../components/transaction/types/TransactionViewProps";
import TransferTransaction from "../components/transaction/types/TransferTransaction";
import { StackParamList } from "../lib/NavigatorParamList";
import IComment from "../lib/types/Comment";
import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import Transaction, { TransactionType } from "../lib/types/Transaction";
import User from "../lib/types/User";
import { useOfflineSWR } from "../lib/useOfflineSWR";
import { palette } from "../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "Transaction">;

export default function TransactionPage({
  route: {
    params: { transactionId, transaction: _transaction, orgId },
  },
  navigation,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();
  //filter in case of deeplink with #commentId
  const txnId = transactionId.split("#")[0];
  const { data: transaction, isLoading } = useOfflineSWR<
    Transaction & { organization?: Organization }
  >(
    orgId
      ? `organizations/${orgId}/transactions/${txnId}`
      : `transactions/${txnId}`,
    { fallbackData: _transaction },
  );
  const { data: comments } = useOfflineSWR<IComment[]>(
    `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/comments`,
  );
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${orgId || transaction?.organization?.id}`,
  );
  const { data: user } = useOfflineSWR<User>(`user`);
  const isUserInOrganizationOrAuditor = useMemo(() => {
    return organization?.users.some((u) => u.id === user?.id) || user?.auditor;
  }, [organization, user]);
  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    if (transaction) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={async () => {
              const hcbCode = transaction.id.split("txn_")[1];
              const url = `https://hcb.hackclub.com/hcb/${hcbCode}`;
              try {
                await Share.share({
                  message: url,
                  url: url,
                });
              } catch (error) {
                console.error("Error sharing transaction:", error);
              }
            }}
            style={{ padding: 8 }}
            accessibilityLabel="Share transaction"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={22} color={themeColors.text} />
          </TouchableOpacity>
        ),
      });
    }
  }, [transaction, navigation, themeColors.text]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}`,
          undefined,
          { revalidate: true },
        ),
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/comments`,
          undefined,
          { revalidate: true },
        ),
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/receipts`,
          { revalidate: true },
        ),
        globalMutate(
          (key) =>
            typeof key === "string" &&
            key.startsWith(
              `organizations/${transaction?.organization?.id || orgId}/transactions`,
            ),
        ),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!transaction || isLoading) {
    return <TransactionSkeleton />;
  }

  const currentOrgId = orgId || transaction?.organization?.id;
  if (!currentOrgId) {
    return <TransactionSkeleton />;
  }

  const transactionViewProps: Omit<TransactionViewProps, "transaction"> = {
    orgId: currentOrgId,
    navigation,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "position" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabBarHeight + 20,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AdminTools
          style={{ marginBottom: 20 }}
          onPress={() =>
            Linking.openURL(
              `https://hcb.hackclub.com/hcb/${transaction.id.slice(4)}`,
            )
          }
        >
          <Text style={{ color: themeColors.text }} numberOfLines={1}>
            <Text style={{ color: palette.muted }}>HCB code:</Text>{" "}
            {transaction._debug?.hcb_code || `HCB-${transaction.code}`}
          </Text>
        </AdminTools>

        {
          /* prettier-ignore */
          match(transaction)
          .with({ card_charge: P.any },            (tx) => <CardChargeTransaction   transaction={tx} {...transactionViewProps} />)
          .with({ check: P.any },                  (tx) => <CheckTransaction        transaction={tx} {...transactionViewProps} />)
          .with({ transfer: P.any },               (tx) => <TransferTransaction     transaction={tx} {...transactionViewProps} />)
          .with({ donation: P.any },               (tx) => <DonationTransaction     transaction={tx} {...transactionViewProps} />)
          .with({ ach_transfer: P.any },           (tx) => <AchTransferTransaction  transaction={tx} {...transactionViewProps} />)
          .with({ check_deposit: P.any },          (tx) => <CheckDepositTransaction transaction={tx} {...transactionViewProps} />)
          .with({ invoice: P.any },                (tx) => <InvoiceTransaction      transaction={tx} {...transactionViewProps} />)
          .with({ expense_payout: P.any },         (tx) => <ExpensePayoutTransaction transaction={tx} {...transactionViewProps} />)
          .with({ code: TransactionType.BankFee }, (tx) => <BankFeeTransaction      transaction={tx} {...transactionViewProps} />)
          .otherwise(                              (tx) => <BankAccountTransaction  transaction={tx} {...transactionViewProps} />)
        }

        <View style={{ gap: 12 }}>
          {comments && comments.length > 0 && (
            <View style={{ flex: 1, gap: 12 }}>
              {comments.map((comment) => (
                <Comment comment={comment} key={comment.id} />
              ))}
            </View>
          )}
          {isUserInOrganizationOrAuditor && (
            <CommentField orgId={currentOrgId} transactionId={txnId} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
