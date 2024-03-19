import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  ScrollView,
  View,
  Text,
  Linking,
} from "react-native";
import useSWR from "swr";
import { match, P } from "ts-pattern";

import AdminTools from "../components/AdminTools";
import Divider from "../components/Divider";
import Comment from "../components/transaction/Comment";
import AchTransferTransaction from "../components/transaction/types/AchTransferTransaction";
import BankAccountTransaction from "../components/transaction/types/BankAccountTransaction";
import BankFeeTransaction from "../components/transaction/types/BankFeeTransaction";
import CardChargeTransaction from "../components/transaction/types/CardChargeTransaction";
import CheckTransaction from "../components/transaction/types/CheckTransaction";
import DonationTransaction from "../components/transaction/types/DonationTransaction";
import { TransactionViewProps } from "../components/transaction/types/TransactionViewProps";
import TransferTransaction from "../components/transaction/types/TransferTransaction";
import { StackParamList } from "../lib/NavigatorParamList";
import IComment from "../lib/types/Comment";
import Organization from "../lib/types/Organization";
import Transaction, { TransactionType } from "../lib/types/Transaction";
import { palette } from "../theme";

type Props = NativeStackScreenProps<StackParamList, "Transaction">;

export default function TransactionPage({
  route: {
    params: { transactionId, transaction: _transaction, orgId },
  },
}: Props) {
  const { data: transaction } = useSWR<
    Transaction & { organization?: Organization }
  >(
    orgId
      ? `/organizations/${orgId}/transactions/${transactionId}`
      : `/transactions/${transactionId}`,
    { fallbackData: _transaction },
  );
  const { data: comments } = useSWR<IComment[]>(
    () =>
      `/organizations/${
        orgId || transaction!.organization!.id
      }/transactions/${transactionId}/comments`,
  );

  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  if (!transaction) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const transactionViewProps: Omit<TransactionViewProps, "transaction"> = {
    orgId: orgId || transaction.organization!.id,
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
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
          .with({ card_charge: P.any },            (tx) => <CardChargeTransaction  transaction={tx} {...transactionViewProps} />)
          .with({ check: P.any },                  (tx) => <CheckTransaction       transaction={tx} {...transactionViewProps} />)
          .with({ transfer: P.any },               (tx) => <TransferTransaction    transaction={tx} {...transactionViewProps} />)
          .with({ donation: P.any },               (tx) => <DonationTransaction    transaction={tx} {...transactionViewProps} />)
          .with({ ach_transfer: P.any },           (tx) => <AchTransferTransaction transaction={tx} {...transactionViewProps} />)
          .with({ code: TransactionType.BankFee }, (tx) => <BankFeeTransaction     transaction={tx} {...transactionViewProps} />)
          .otherwise(                              (tx) => <BankAccountTransaction transaction={tx} {...transactionViewProps} />)
      }

      {comments && comments.length > 0 && (
        <>
          <Divider />
          <View style={{ gap: 20 }}>
            {comments.map((comment) => (
              <Comment comment={comment} key={comment.id} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
