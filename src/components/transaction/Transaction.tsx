import { faPaypal } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { View, Text, ViewProps, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { match } from "ts-pattern";

import {
  TransactionCardCharge,
  TransactionType,
  TransactionWithoutId,
} from "../../lib/types/Transaction";
import { useIsDark } from "../../lib/useColorScheme";
import { useMerchantIcon } from "../../lib/useMerchantIcon";
import { palette } from "../../theme";
import { renderMoney } from "../../util";
import WiseIcon from "../icons/WiseIcon";
import UserAvatar from "../UserAvatar";

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
      } else if (transaction.memo == "💰 Hackathon grant from Hack Club") {
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

  if (!hideAvatar && transaction.code == TransactionType.StripeCard) {
    return (
      <UserAvatar
        user={(transaction as TransactionCardCharge).card_charge.card.user}
        size={20}
      />
    );
  } else {
    if (transactionIcon(transaction) == "paypal") {
      return (
        <FontAwesomeIcon color={palette.muted} icon={faPaypal} size={20} />
      );
    } else if (transactionIcon(transaction) == "wise") {
      return <WiseIcon color={palette.muted} size={20} />;
    } else {
      return (
        <Icon
          // @ts-expect-error it is checked above
          glyph={transactionIcon(transaction)}
          color={
            transaction.appearance == "hackathon_grant"
              ? palette.black
              : palette.muted
          }
          size={20}
        />
      );
    }
  }
}

function Transaction({
  transaction,
  // orgId,
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

  return (
    <View>
      <View
        style={StyleSheet.compose(
          {
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor:
              transaction.declined || transaction.amount_cents < 0
                ? isDark
                  ? "#351921"
                  : "#F9E3E7"
                : transaction.amount_cents > 0
                  ? isDark
                    ? "#234740"
                    : "#d7f7ee"
                  : themeColors.card,
            borderTopLeftRadius: top ? 8 : 0,
            borderTopRightRadius: top ? 8 : 0,
            borderBottomLeftRadius: bottom ? 8 : 0,
            borderBottomRightRadius: bottom ? 8 : 0,
            overflow: "hidden",
          },
          style,
        )}
      >
        {transaction.appearance == "hackathon_grant" && (
          <LinearGradient
            colors={["#e2b142", "#fbe87a", "#e2b142", "#fbe87a"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
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

        {!hidePendingLabel && (transaction.declined || transaction.pending) && (
          <View
            style={
              transaction.declined
                ? {
                    backgroundColor: isDark ? "#401A23" : "#891A2A",
                    borderWidth: 1,
                    borderColor: isDark ? "#401A23" : "#891A2A",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginRight: 4,
                  }
                : {
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#8492a6",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginRight: 4,
                  }
            }
          >
            <Text
              style={
                transaction.declined
                  ? {
                      color: isDark ? "#891A2A" : "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                    }
                  : { color: "#8492a6", fontSize: 12, fontWeight: "bold" }
              }
            >
              {transaction.declined ? "Declined" : "Pending"}
            </Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            color:
              transaction.appearance == "hackathon_grant"
                ? palette.black
                : transaction.pending
                  ? palette.muted
                  : themeColors.text,
            overflow: "hidden",
            flex: 1,
          }}
        >
          {match(transaction)
            .with(
              { appearance: "hackathon_grant", has_custom_memo: false },
              () => "💰 Hackathon grant",
            )
            // .with(
            //   {
            //     card_charge: { merchant: { smart_name: P.string } },
            //     has_custom_memo: false,
            //   },
            //   (tx) => tx.card_charge.merchant.smart_name,
            // )
            .otherwise((tx) => tx.memo)
            .replaceAll(/\s{2,}/g, " ")}
        </Text>
        {transaction.missing_receipt && !hideMissingReceipt && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#ff8c37",
              borderRadius: 20,
              paddingHorizontal: 5,
              paddingVertical: 2,
              marginRight: 4,
              backgroundColor: isDark ? "#2E161D" : "#FBEAED",
            }}
          >
            <Icon glyph="payment-docs" color="#ff8c37" size={18} />
            <Text
              style={{
                color: "#ff8c37",
                fontSize: 12,
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              0
            </Text>
          </View>
        )}
        <Text
          style={{
            color:
              transaction.appearance == "hackathon_grant"
                ? palette.black
                : themeColors.text,
          }}
        >
          {renderMoney(transaction.amount_cents)}
        </Text>
      </View>
    </View>
  );
}

export default memo(Transaction);
