import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import useSWR from "swr";

import BankAccountTransaction from "../components/transaction/types/BankAccountTransaction";
import CardChargeTransaction from "../components/transaction/types/CardChargeTransaction";
import CheckTransaction from "../components/transaction/types/CheckTransaction";
import DonationTransaction from "../components/transaction/types/DonationTransaction";
import { TransactionViewProps } from "../components/transaction/types/TransactionViewProps";
import TransferTransaction from "../components/transaction/types/TransferTransaction";
import { StackParamList } from "../lib/NavigatorParamList";
import Transaction from "../lib/types/Transaction";

type Props = NativeStackScreenProps<StackParamList, "Transaction">;

export default function TransactionPage({
  route: {
    params: { transaction: _transaction, ...params },
  },
}: Props) {
  const { data: transaction } = useSWR<Transaction>(
    `/organizations/${params.orgId}/transactions/${_transaction.id}`,
    { fallbackData: _transaction },
  );

  if (!transaction) {
    return <ActivityIndicator />;
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
    <View style={{ padding: 20 }}>
      <TransactionComponent transaction={transaction} orgId={params.orgId} />
    </View>
  );
}
