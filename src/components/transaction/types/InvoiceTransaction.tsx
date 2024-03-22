import { View } from "react-native";

import { TransactionInvoice } from "../../../lib/types/Transaction";
import { renderMoney } from "../../../util";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function InvoiceTransaction({
  transaction: { invoice, ...transaction },
  ...props
}: TransactionViewProps<TransactionInvoice>) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(transaction.amount_cents)}{" "}
        <Muted>invoice payment from</Muted>
        {"\n"}
        {invoice.sponsor.name}
      </TransactionTitle>

      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, props.navigation),
          {
            label: "Invoice description",
            value: invoice.description,
          },
        ]}
      />

      <TransactionDetails
        title="Sponsor details"
        details={[
          { label: "Name", value: invoice.sponsor.name },
          { label: "Email", value: invoice.sponsor.email },
        ]}
      />
    </View>
  );
}
