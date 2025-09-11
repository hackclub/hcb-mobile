import { View } from "react-native";

import { TransactionAchTransfer } from "../../../lib/types/Transaction";
import { palette } from "../../../styles/theme";
import { renderDate, renderMoney } from "../../../utils/util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function AchTransferTransaction({
  transaction: { ach_transfer, ...transaction },
  orgId,
  navigation,
}: TransactionViewProps<TransactionAchTransfer>) {
  const isIncoming = transaction.amount_cents > 0;

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
          <Muted>{isIncoming ? "received via" : "sent via"}</Muted>
          {"\n"}
          ACH Transfer
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Recipient",
            value: ach_transfer.recipient_name,
          },
          ...(ach_transfer.recipient_email
            ? [
                {
                  label: "Email",
                  value: ach_transfer.recipient_email,
                },
              ]
            : []),
          {
            label: "Bank",
            value: ach_transfer.bank_name,
          },
          ...(ach_transfer.account_number_last4
            ? [
                {
                  label: "Account",
                  value: `•••• ${ach_transfer.account_number_last4}`,
                  fontFamily: "JetBrainsMono-Regular",
                },
              ]
            : []),
          ...(ach_transfer.routing_number
            ? [
                {
                  label: "Routing",
                  value: ach_transfer.routing_number,
                  fontFamily: "JetBrainsMono-Regular",
                },
              ]
            : []),
          {
            label: "Purpose",
            value: ach_transfer.payment_for,
          },
          descriptionDetail(orgId, transaction, navigation),
          {
            label: isIncoming ? "Received on" : "Sent on",
            value: renderDate(transaction.date),
          },
          ...(ach_transfer.sender
            ? [
                {
                  label: isIncoming ? "Received by" : "Sent by",
                  value: <UserMention user={ach_transfer.sender} />,
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}
