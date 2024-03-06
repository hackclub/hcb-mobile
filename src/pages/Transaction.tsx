import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, ScrollView, View } from "react-native";
import useSWR from "swr";

import Divider from "../components/Divider";
import Comment from "../components/transaction/Comment";
import BankAccountTransaction from "../components/transaction/types/BankAccountTransaction";
import CardChargeTransaction from "../components/transaction/types/CardChargeTransaction";
import CheckTransaction from "../components/transaction/types/CheckTransaction";
import DonationTransaction from "../components/transaction/types/DonationTransaction";
import { TransactionViewProps } from "../components/transaction/types/TransactionViewProps";
import TransferTransaction from "../components/transaction/types/TransferTransaction";
import { StackParamList } from "../lib/NavigatorParamList";
import IComment from "../lib/types/Comment";
import Organization from "../lib/types/Organization";
import Transaction from "../lib/types/Transaction";

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

  if (!transaction) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  let TransactionComponent: (props: TransactionViewProps) => React.ReactElement;

  if ("card_charge" in transaction) {
    TransactionComponent = CardChargeTransaction;
  } else if ("donation" in transaction) {
    TransactionComponent = DonationTransaction;
  } else if ("check" in transaction) {
    TransactionComponent = CheckTransaction;
  } else if ("transfer" in transaction) {
    TransactionComponent = TransferTransaction;
  } else {
    TransactionComponent = BankAccountTransaction;
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
    >
      <TransactionComponent
        transaction={transaction}
        orgId={
          orgId ||
          (transaction as Transaction & { organization: Organization })
            ?.organization?.id
        }
      />

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
