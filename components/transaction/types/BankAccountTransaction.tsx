import { View } from "react-native";

import { TransactionViewProps } from "./TransactionViewProps";

import { Text } from "@/components/Text";
import ReceiptList from "@/components/transaction/ReceiptList";
import TransactionDetails, {
  descriptionDetail,
} from "@/components/transaction/TransactionDetails";
import TransactionTitle, {
  Muted,
} from "@/components/transaction/TransactionTitle";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";

export default function BankAccountTransaction({
  transaction,
  navigation: _navigation,
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
          descriptionDetail(props.orgId, transaction),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
      <ReceiptList transaction={transaction} />
    </View>
  );
}
