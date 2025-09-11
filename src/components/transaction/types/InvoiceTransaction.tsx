import { format } from "date-fns";
import { View } from "react-native";

import { TransactionInvoice } from "../../../lib/types/Transaction";
import { palette } from "../../../styles/theme";
import { renderMoney } from "../../../utils/util";
import Badge from "../../Badge";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function InvoiceTransaction({
  transaction: { invoice, ...transaction },
  orgId,
  navigation,
}: TransactionViewProps<TransactionInvoice>) {
  const isPaid = !!invoice.paid_at;
  const isOverdue = !isPaid && new Date(invoice.due_date) < new Date();

  const badge = transaction.pending ? (
    <Badge icon="information-circle-outline" color={palette.info}>
      Pending
    </Badge>
  ) : isPaid ? (
    <Badge icon="checkmark-circle" color={palette.success}>
      Paid
    </Badge>
  ) : isOverdue ? (
    <Badge icon="alert-circle" color={palette.primary}>
      Overdue
    </Badge>
  ) : null;

  return (
    <View>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <TransactionTitle badge={badge}>
          {renderMoney(Math.abs(transaction.amount_cents))}{" "}
          <Muted>invoice for</Muted>
          {"\n"}
          {invoice.sponsor.name}
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Invoice ID",
            value: invoice.id,
            fontFamily: "JetBrainsMono-Regular",
          },
          {
            label: "Description",
            value: invoice.description,
          },
          {
            label: "Sponsor",
            value: invoice.sponsor.name,
          },
          {
            label: "Email",
            value: invoice.sponsor.email,
          },
          descriptionDetail(orgId, transaction, navigation),
          {
            label: "Sent on",
            value: format(new Date(invoice.sent_at), "MMM d, yyyy 'at' h:mm a"),
          },
          {
            label: "Due date",
            value: format(new Date(invoice.due_date), "MMM d, yyyy"),
          },
          ...(invoice.paid_at
            ? [
                {
                  label: "Paid on",
                  value: format(
                    new Date(invoice.paid_at),
                    "MMM d, yyyy 'at' h:mm a",
                  ),
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}
