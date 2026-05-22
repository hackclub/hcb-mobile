import { faPaypal } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useTheme } from "expo-router/react-navigation";
import Icon from "@thedev132/hackclub-icons-rn";
import { Text } from "@/components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { SvgXml } from "react-native-svg";
import { match } from "ts-pattern";

import WiseIcon from "@/components/icons/WiseIcon";
import UserAvatar from "@/components/UserAvatar";
import {
  TransactionCardCharge,
  TransactionType,
  TransactionWithoutId,
} from "@/lib/types/Transaction";
import { useIsDark } from "@/lib/useColorScheme";
import { useMerchantIcon } from "@/lib/useMerchantIcon";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

// Semantic colors for transaction states (dark / light pairs)
const colors = {
  reversedBg: { dark: "#252429", light: "#EAEDF1" },
  declinedBg: { dark: "#351921", light: "#F9E3E7" },
  positiveBg: { dark: "#234740", light: "#d7f7ee" },
  reversedBadge: { dark: "#2A394C", light: "#D5E0EF" },
  declinedBadge: { dark: "#401A23", light: "#891A2A" },
  reversedBadgeText: { dark: palette.info, light: "#D5E0EF" },
  declinedBadgeText: { dark: "#891A2A", light: "#fff" },
  missingReceiptBg: { dark: "#2E161D", light: "#FBEAED" },
} as const;

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  hackathonGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgeBase: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    borderWidth: 1,
  },
  pendingBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.muted,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: palette.muted,
  },
  memoText: {
    fontSize: 14,
    overflow: "hidden",
    flex: 1,
  },
  missingReceiptBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.warning,
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 4,
  },
  missingReceiptText: {
    color: palette.warning,
    fontSize: 12,
    fontWeight: "bold",
  },
});

function transactionIcon({ code, ...transaction }: TransactionWithoutId) {
  switch (code) {
    case TransactionType.Donation:
    case TransactionType.PartnerDonation:
      return "support";
    case TransactionType.Check:
    case TransactionType.IncreaseCheck:
      return "email";
    case TransactionType.CheckDeposit:
      return "briefcase";
    case TransactionType.Disbursement:
      if (transaction.memo.startsWith("Grant to")) {
        return "purse-fill";
      } else if (transaction.memo === "💰 Hackathon grant from Hack Club") {
        return "purse";
      }
      if (transaction.amount_cents > 0) {
        return "door-enter";
      } else {
        return "door-leave";
      }
    case TransactionType.StripeCard:
    case TransactionType.StripeForceCapture:
      if (transaction.amount_cents > 0) {
        return "view-reload";
      }
      return "card";
    case TransactionType.BankFee:
      return "minus";
    case TransactionType.FeeRevenue:
      return "plus";
    case TransactionType.Invoice:
      return "briefcase";
    case TransactionType.ExpensePayout:
      return "attachment";
    case TransactionType.Wire:
      return "web";
    case TransactionType.Paypal:
      return "paypal";
    case TransactionType.Wise:
      return "wise";
    case TransactionType.AchTransfer:
      return "payment-transfer";
    default:
      return "payment-docs";
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

  const iconName = transactionIcon(transaction);
  const iconColor =
    transaction.appearance === "hackathon_grant"
      ? palette.black
      : palette.muted;

  if (!hideAvatar && transaction.code === TransactionType.StripeCard) {
    return (
      <UserAvatar
        user={(transaction as TransactionCardCharge).card_charge.card.user}
        size={20}
      />
    );
  }

  if (iconName === "paypal") {
    return <FontAwesomeIcon color={iconColor} icon={faPaypal} size={20} />;
  }

  if (iconName === "wise") {
    return <WiseIcon color={iconColor} size={22} />;
  }

  return <Icon glyph={iconName} color={iconColor} size={22} />;
}

function Transaction({
  transaction,
  top = false,
  bottom = false,
  hideAvatar,
  hideIcon,
  hidePendingLabel,
  hideMissingReceipt,
  showMerchantIcon,
  style,
}: ViewProps & {
  transaction: TransactionWithoutId;
  orgId: string;
  top?: boolean;
  bottom?: boolean;
  hideAvatar?: boolean;
  hideIcon?: boolean;
  hidePendingLabel?: boolean;
  hideMissingReceipt?: boolean;
  showMerchantIcon?: boolean;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const networkId =
    transaction.code === TransactionType.StripeCard
      ? (transaction as TransactionCardCharge).card_charge?.merchant?.network_id
      : undefined;
  const autoMerchantIcon = useMerchantIcon(networkId);

  const finalMerchantIcon = showMerchantIcon ? autoMerchantIcon : null;

  const backgroundColor = transaction.reversed
    ? isDark
      ? colors.reversedBg.dark
      : colors.reversedBg.light
    : transaction.declined || transaction.amount_cents < 0
      ? isDark
        ? colors.declinedBg.dark
        : colors.declinedBg.light
      : transaction.amount_cents > 0
        ? isDark
          ? colors.positiveBg.dark
          : colors.positiveBg.light
        : themeColors.card;

  const isHackathonGrant = transaction.appearance === "hackathon_grant";

  const textColor = isHackathonGrant
    ? palette.black
    : transaction.pending
      ? palette.muted
      : themeColors.text;

  const amountColor = isHackathonGrant ? palette.black : themeColors.text;

  const reversedBadgeColor = isDark
    ? colors.reversedBadge.dark
    : colors.reversedBadge.light;
  const declinedBadgeColor = isDark
    ? colors.declinedBadge.dark
    : colors.declinedBadge.light;

  return (
    <View
      style={StyleSheet.compose(
        [
          styles.row,
          {
            backgroundColor,
            borderTopLeftRadius: top ? 8 : 0,
            borderTopRightRadius: top ? 8 : 0,
            borderBottomLeftRadius: bottom ? 8 : 0,
            borderBottomRightRadius: bottom ? 8 : 0,
          },
        ],
        style,
      )}
    >
      {isHackathonGrant && (
        <LinearGradient
          colors={["#e2b142", "#fbe87a", "#e2b142", "#fbe87a"]}
          style={styles.hackathonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      )}
      {finalMerchantIcon ? (
        <SvgXml
          xml={finalMerchantIcon}
          width={20}
          height={20}
          fill={palette.muted}
        />
      ) : (
        <TransactionIcon
          transaction={transaction}
          hideAvatar={hideAvatar}
          hideIcon={hideIcon}
        />
      )}
      {!hidePendingLabel &&
        (transaction.reversed ||
          transaction.declined ||
          transaction.pending) && (
          <View
            style={
              transaction.reversed
                ? [
                    styles.badgeBase,
                    {
                      backgroundColor: reversedBadgeColor,
                      borderColor: reversedBadgeColor,
                    },
                  ]
                : transaction.declined
                  ? [
                      styles.badgeBase,
                      {
                        backgroundColor: declinedBadgeColor,
                        borderColor: declinedBadgeColor,
                      },
                    ]
                  : styles.pendingBadge
            }
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: transaction.reversed
                    ? isDark
                      ? colors.reversedBadgeText.dark
                      : colors.reversedBadgeText.light
                    : transaction.declined
                      ? isDark
                        ? colors.declinedBadgeText.dark
                        : colors.declinedBadgeText.light
                      : palette.muted,
                },
              ]}
            >
              {transaction.reversed
                ? "Reversed"
                : transaction.declined
                  ? "Declined"
                  : "Pending"}
            </Text>
          </View>
        )}
      <Text
        numberOfLines={1}
        style={[styles.memoText, { color: textColor }]}
      >
        {match(transaction)
          .with(
            { appearance: "hackathon_grant", has_custom_memo: false },
            () => "💰 Hackathon grant",
          )
          .otherwise((tx) => tx.memo)
          .replaceAll(/\s{2,}/g, " ")}
      </Text>
      {transaction.missing_receipt && !hideMissingReceipt && (
        <View
          style={[
            styles.missingReceiptBadge,
            {
              backgroundColor: isDark
                ? colors.missingReceiptBg.dark
                : colors.missingReceiptBg.light,
            },
          ]}
        >
          <Icon glyph="payment-docs" color={palette.warning} size={18} />
          <Text style={styles.missingReceiptText}>0</Text>
        </View>
      )}
      <Text style={{ color: amountColor }}>
        {renderMoney(transaction.amount_cents)}
      </Text>
    </View>
  );
}

export default memo(Transaction);
