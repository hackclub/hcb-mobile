import { View } from "react-native";

import { TransactionCardCharge } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import ReceiptList from "../ReceiptList";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function CardChargeTransaction({
  transaction: {
    card_charge: { merchant, ...card_charge },
    ...transaction
  },
  orgId,
  navigation,
}: TransactionViewProps<TransactionCardCharge>) {
  const isRefund = transaction.amount_cents > 0;

  const badge = transaction.pending ? (
    <Badge icon="information-circle-outline" color={palette.info}>
      Pending
    </Badge>
  ) : transaction.declined ? (
    <Badge icon="information-circle-outline" color={palette.primary}>
      Declined
    </Badge>
  ) : null;

  return (
    <View>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <TransactionTitle badge={badge}>
          {renderMoney(Math.abs(transaction.amount_cents))}{" "}
          <Muted>{isRefund ? "refund from" : "charge at"}</Muted>
          {"\n"}
          {merchant.smart_name}
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Memo",
            value: merchant.name,
          },
          descriptionDetail(orgId, transaction, navigation),
          {
            label: isRefund ? "Refunded on" : "Spent on",
            value: renderDate(transaction.date),
          },
          {
            label: isRefund ? "Refunded to" : "Spent by",
            value: <UserMention user={card_charge.card.user} />,
          },
        ]}
      />
      <ReceiptList transaction={transaction} />
    </View>
  );
}
