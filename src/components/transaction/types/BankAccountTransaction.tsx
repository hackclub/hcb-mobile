import { View } from "react-native";

import { renderDate, renderMoney } from "../../../util";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function BankAccountTransaction({
  transaction,
  ...props
}: TransactionViewProps) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(transaction.amount_cents)} <Muted>transaction</Muted>
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, props.navigation),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
    </View>
  );
}
