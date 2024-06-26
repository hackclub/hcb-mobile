import humanizeString from "humanize-string";
import { View } from "react-native";

import { TransactionCheck } from "../../../lib/types/Transaction";
import { renderMoney, statusColor } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
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
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          ...(check.sender
            ? [{ label: "Sent by", value: <UserMention user={check.sender} /> }]
            : []),
        ]}
      />
    </View>
  );
}
