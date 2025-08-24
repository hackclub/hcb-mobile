import { Text, View } from "react-native";

import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import ReceiptList from "../ReceiptList";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function BankAccountTransaction({
  transaction,
  navigation,
  ...props
}: TransactionViewProps) {
  return (
    <View>
      <TransactionTitle>
        <Text
          style={{
            color:
              transaction.amount_cents < 0 ? palette.primary : palette.success,
          }}
        >
          {transaction.amount_cents < 0 ? "-" : "+"}
        </Text>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>{transaction.amount_cents < 0 ? "debit" : "deposit"}</Muted>
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
      <ReceiptList transaction={transaction} />
    </View>
  );
}
