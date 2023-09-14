import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { View, Text } from "react-native";

import ITransaction, { TransactionType } from "../lib/types/Transaction";
import { palette } from "../theme";
import { renderMoney } from "../util";

function transactionIcon(
  code: TransactionType,
): React.ComponentProps<typeof Ionicons>["name"] {
  switch (code) {
    case TransactionType.Donation:
    case TransactionType.PartnerDonation:
      return "heart-outline";
    case TransactionType.Check:
    case TransactionType.IncreaseCheck:
      return "mail-outline";
    case TransactionType.CheckDeposit:
      return "receipt-outline";
    case TransactionType.Disbursement:
      return "arrow-redo-outline";
    case TransactionType.StripeCard:
    case TransactionType.StripeForceCapture:
      return "card-outline";
    case TransactionType.BankFee:
      return "remove-circle-outline";
    case TransactionType.FeeRevenue:
      return "add-circle-outline";
    case TransactionType.Invoice:
      return "receipt-outline";
    default:
      return "cash-outline";
  }
}

const Transaction = memo(function Transaction({
  transaction,
  top,
  bottom,
}: {
  transaction: ITransaction;
  top: boolean;
  bottom: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: palette.darkless,
        borderTopLeftRadius: top ? 8 : 0,
        borderTopRightRadius: top ? 8 : 0,
        borderBottomLeftRadius: bottom ? 8 : 0,
        borderBottomRightRadius: bottom ? 8 : 0,
      }}
    >
      <Ionicons
        name={transactionIcon(transaction.code)}
        color={palette.muted}
        size={20}
        style={{ marginRight: 10 }}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          color: transaction.pending ? palette.muted : palette.smoke,
          overflow: "hidden",
          flex: 1,
        }}
      >
        {transaction.declined
          ? "Declined: "
          : transaction.pending
          ? "Pending: "
          : ""}
        {transaction.memo.replaceAll(/\s{2,}/g, " ")}
      </Text>
      <Text
        style={{
          marginLeft: "auto",
          paddingLeft: 10,
          color: transaction.amount_cents < 0 ? palette.primary : "#33d6a6",
        }}
      >
        {renderMoney(transaction.amount_cents)}
      </Text>
    </View>
  );
});

export default Transaction;
