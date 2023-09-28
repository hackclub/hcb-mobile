import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import Transaction from "../../../lib/types/Transaction";
import { renderDate, renderMoney } from "../../../util";
import TransactionDetails from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

export default function BankAccountTransaction({
  transaction,
}: {
  transaction: Transaction;
  navigation: NativeStackNavigationProp<StackParamList, "Transaction">;
}) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(transaction.amount_cents)} <Muted>transaction</Muted>
      </TransactionTitle>
      <TransactionDetails
        details={[
          { label: "Description", value: transaction.memo },
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
    </View>
  );
}
