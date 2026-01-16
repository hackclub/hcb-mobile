import { View } from "react-native";

import { TransactionWise } from "../../../lib/types/Transaction";
import { palette } from "../../../styles/theme";
import { renderDate, renderMoney } from "../../../utils/util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function WiseTransaction({
  transaction: { wise_transfer, ...transaction },
  orgId,
  navigation,
}: TransactionViewProps<TransactionWise>) {
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
          {renderMoney(Math.abs(wise_transfer.amount_cents)).slice(1)}{" "}
          {wise_transfer.currency} <Muted>sent via</Muted>
          {"\n"}
          Wise Transfer
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Recipient",
            value: wise_transfer.recipient_name,
          },
          ...(wise_transfer.recipient_email
            ? [
                {
                  label: "Recipient Email",
                  value: wise_transfer.recipient_email,
                },
              ]
            : []),
          {
            label: "Recipient Country",
            value: wise_transfer.recipient_country,
          },
          {
            label: "Purpose",
            value: wise_transfer.payment_for,
          },
          {
            label: "Amount",
            value: [
              `${renderMoney(Math.abs(wise_transfer.amount_cents)).slice(1)} ${wise_transfer.currency}`,
              wise_transfer.usd_amount_cents &&
                `(${renderMoney(wise_transfer.usd_amount_cents)} USD)`,
            ]
              .filter(Boolean)
              .join(" "),
          },
          ...(wise_transfer.return_reason
            ? [
                {
                  label: "Return Reason",
                  value: wise_transfer.return_reason,
                },
              ]
            : []),
          descriptionDetail(orgId, transaction, navigation),
          {
            label: "Sent",
            value: [
              renderDate(transaction.date),
              wise_transfer.sent_at && renderDate(wise_transfer.sent_at),
            ]
              .filter(Boolean)
              .join(" • "),
          },
          ...(wise_transfer.sender
            ? [
                {
                  label: "Sent by",
                  value: <UserMention user={wise_transfer.sender} />,
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}
