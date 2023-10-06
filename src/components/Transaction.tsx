import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { memo } from "react";
import { View, Text, ViewProps, StyleSheet } from "react-native";

import {
  TransactionCardCharge,
  TransactionType,
  TransactionWithoutId,
} from "../lib/types/Transaction";
import { palette } from "../theme";
import { renderMoney } from "../util";

import UserAvatar from "./UserAvatar";

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

function TransactionIcon({
  transaction,
  hideAvatar,
  hideIcon,
}: {
  transaction: TransactionWithoutId;
  hideAvatar?: boolean;
  hideIcon?: boolean;
}) {
  if (hideIcon) return null;

  if (!hideAvatar && transaction.code == TransactionType.StripeCard) {
    return (
      <UserAvatar
        user={(transaction as TransactionCardCharge).card_charge.card.user}
        size={20}
        style={{ marginRight: 10 }}
      />
    );
  } else {
    return (
      <Ionicons
        name={transactionIcon(transaction.code)}
        color={palette.muted}
        size={20}
        style={{ marginRight: 10 }}
      />
    );
  }
}

function Transaction({
  transaction,
  top = false,
  bottom = false,
  hideAvatar,
  hideIcon,
  hidePendingLabel,
  style,
}: ViewProps & {
  transaction: TransactionWithoutId;
  top?: boolean;
  bottom?: boolean;
  hideAvatar?: boolean;
  hideIcon?: boolean;
  hidePendingLabel?: boolean;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={StyleSheet.compose(
        {
          padding: 10,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: themeColors.card,
          borderTopLeftRadius: top ? 8 : 0,
          borderTopRightRadius: top ? 8 : 0,
          borderBottomLeftRadius: bottom ? 8 : 0,
          borderBottomRightRadius: bottom ? 8 : 0,
        },
        style,
      )}
    >
      <TransactionIcon
        transaction={transaction}
        hideAvatar={hideAvatar}
        hideIcon={hideIcon}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          color: transaction.pending ? palette.muted : themeColors.text,
          overflow: "hidden",
          flex: 1,
        }}
      >
        {!hidePendingLabel &&
          (transaction.declined
            ? "Declined: "
            : transaction.pending
            ? "Pending: "
            : "")}
        {transaction.memo.replaceAll(/\s{2,}/g, " ")}
      </Text>
      <Text
        style={{
          marginLeft: "auto",
          paddingLeft: 10,
          color: transaction.amount_cents > 0 ? "#33d6a6" : palette.muted,
        }}
      >
        {renderMoney(transaction.amount_cents)}
      </Text>
    </View>
  );
}

export default memo(Transaction);
