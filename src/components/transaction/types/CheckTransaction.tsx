import humanizeString from "humanize-string";
import { View } from "react-native";

import { TransactionCheck } from "../../../lib/types/Transaction";
import { renderMoney, statusColor } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import CheckComponent from "../Check";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function CheckTransaction({
  transaction: { check, ...transaction },
  navigation,
  ...props
}: TransactionViewProps<TransactionCheck>) {

  return (
    <View>
      <TransactionTitle
        badge={
          check.status && (
            <Badge color={statusColor(check.status)}>
              {humanizeString(check.status)}
            </Badge>
          )
        }
      >
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>check to</Muted> {check.recipient_name}
      </TransactionTitle>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CheckComponent 
            date={transaction.date}
            recipientName={check.recipient_name}
            amount={transaction.amount_cents / 100}
            memo={check.memo}
          />
        </View>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          ...(check.sender
            ? [
                { label: "Sent by", value: <UserMention user={check.sender} /> },
                { label: "Sent to", value: check.recipient_name },
                { label: "Recipient email", value: check.recipient_email ?? "" },
                ...(check.check_number
                  ? [{ label: "Check number", value: check.check_number }]
                  : []),
                ...(check.payment_for
                  ? [{ label: "Payment Purpose", value: check.payment_for }]
                  : []),
                { label: "Memo", value: check.memo ?? "" },
                {
                  label: "Addressed to",
                  value: `${check.address_line1 ?? ""} ${
                    check.address_line2 ?? ""
                  }, ${check.address_city ?? ""}, ${check.address_state ?? ""} ${
                    check.address_zip ?? ""
                  }`,
                },
              ]
            : []),
        ]}
      />

    </View>
  );
}
