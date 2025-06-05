import { format } from "date-fns";
import { View } from "react-native";

import { TransactionCardCharge } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import ReceiptList from "../ReceiptList";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

function getCountryFlag(countryCode: string) {
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getChargeMethodLabel(method?: string) {
  switch (method) {
    case "keyed_in":
      return "Manually entered";
    case "swipe":
      return "Card swipe";
    case "chip":
      return "Chip reader";
    case "contactless":
      return "Contactless";
    case "online":
      return "Online";
    default:
      return "Unknown";
  }
}

function getWalletLabel(wallet?: string) {
  switch (wallet) {
    case "apple_pay":
      return "Apple Pay";
    case "google_pay":
      return "Google Pay";
    case "samsung_pay":
      return "Samsung Pay";
    default:
      return null;
  }
}

export default function CardChargeTransaction({
  transaction: {
    card_charge: { merchant, ...card_charge },
    ...transaction
  },
  orgId,
  navigation,
}: TransactionViewProps<TransactionCardCharge>) {
  const isRefund = transaction.amount_cents > 0;
  const walletLabel = getWalletLabel(card_charge.wallet);
  const merchantName = merchant.smart_name || merchant.name;
  const flag = getCountryFlag(merchant.country);

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
          {merchantName}
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Merchant",
            value: `${flag} ${merchant.name}`,
          },
          {
            label: "Method",
            value: getChargeMethodLabel(card_charge.charge_method),
          },
          ...(walletLabel
            ? [
                {
                  label: "Wallet",
                  value: walletLabel,
                },
              ]
            : []),
          descriptionDetail(orgId, transaction, navigation),
          {
            label: isRefund ? "Refunded on" : "Spent on",
            value: format(
              new Date(card_charge.spent_at),
              "MMM d, yyyy 'at' h:mm a",
            ),
          },
          {
            label: isRefund ? "Refunded to" : "Spent by",
            value: <UserMention user={card_charge.card.user} />,
          },
          ...(card_charge.card.last4
            ? [
                {
                  label: "Card",
                  value: `•••• ${card_charge.card.last4}`,
                  fontFamily: "JetBrainsMono-Regular",
                },
              ]
            : []),
        ]}
      />
      {!transaction.declined && <ReceiptList transaction={transaction} />}
    </View>
  );
}
