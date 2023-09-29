import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import useSWR from "swr";

import BankAccountTransaction from "../components/transaction/types/BankAccountTransaction";
import CardChargeTransaction from "../components/transaction/types/CardChargeTransaction";
import DonationTransaction from "../components/transaction/types/DonationTransaction";
import { StackParamList } from "../lib/NavigatorParamList";
import Transaction, {
  TransactionCardCharge,
  TransactionDonation,
  TransactionType,
} from "../lib/types/Transaction";

type Props = NativeStackScreenProps<StackParamList, "Transaction">;

export default function TransactionPage({
  route: {
    params: { transaction: _transaction, ...params },
  },
  navigation,
}: Props) {
  const { data: transaction } = useSWR<Transaction>(
    `/organizations/${params.orgId}/transactions/${_transaction.id}`,
    { fallbackData: _transaction },
  );

  if (!transaction) {
    return <ActivityIndicator />;
  }

  let transactionView: React.ReactElement;

  if (
    transaction.code == TransactionType.StripeCard ||
    transaction.code == TransactionType.StripeForceCapture
  ) {
    transactionView = (
      <CardChargeTransaction
        transaction={transaction as TransactionCardCharge}
        navigation={navigation}
      />
    );
  } else if (transaction.code == TransactionType.Donation) {
    transactionView = (
      <DonationTransaction
        transaction={transaction as TransactionDonation}
        navigation={navigation}
      />
    );
  } else {
    transactionView = (
      <BankAccountTransaction
        transaction={transaction}
        navigation={navigation}
      />
    );
  }

  return <View style={{ padding: 20 }}>{transactionView}</View>;
}
