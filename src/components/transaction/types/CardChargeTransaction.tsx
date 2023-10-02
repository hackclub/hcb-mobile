import { View } from "react-native";

import { TransactionCardCharge } from "../../../lib/types/Transaction";
import { renderDate, renderMoney } from "../../../util";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function CardChargeTransaction({
  transaction,
  orgId,
  navigation,
}: TransactionViewProps<TransactionCardCharge>) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>charge at</Muted> {transaction.card_charge.merchant.name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(orgId, transaction, navigation),
          { label: "Spent on", value: renderDate(transaction.date) },
          {
            label: "Spent by",
            value: <UserMention user={transaction.card_charge.card.user} />,
          },
        ]}
      />
    </View>
  );
}
