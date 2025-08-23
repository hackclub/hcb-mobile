import { Linking, TouchableHighlight, View, Text } from "react-native";

import { TransactionExpensePayout } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import ReceiptList from "../ReceiptList";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function ExpensePayoutTransaction({
  transaction: { expense_payout, ...transaction },
  navigation,
  ...props
}: TransactionViewProps<TransactionExpensePayout>) {
  return (
    <View>
      <TransactionTitle>
        <Muted>
          {transaction.memo ? transaction.memo : "Reimbursement expense payout"}{" "}
          for
        </Muted>{" "}
        {renderMoney(Math.abs(transaction.amount_cents))}
      </TransactionTitle>

      <TransactionDetails
        details={[
          {
            label: "Associated Report",
            value: (
              <TouchableHighlight
                onPress={() =>
                  Linking.openURL(
                    `https://hcb.hackclub.com/reimbursement/reports/${expense_payout.report_id.replace("rmr_", "")}`,
                  )
                }
              >
                <Text
                  style={{
                    color: palette.muted,
                    textAlign: "right",
                    flex: 1,
                    textDecorationLine: "underline",
                  }}
                >
                  View Report
                </Text>
              </TouchableHighlight>
            ),
          },
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
      <ReceiptList transaction={transaction} />
    </View>
  );
}
