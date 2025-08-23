import { faPaypal } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { memo } from "react";
import { View, Text, ViewProps, StyleSheet } from "react-native";

import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../theme";
import { renderMoney } from "../../util";

export interface MockTransactionType {
  amount: {
    value: string;
    cents: number;
  };
  feePayment: boolean;
  date: string;
  localHcbCode?: {
    memo: string;
    receipts: Array<Record<string, never>>;
    comments: Array<Record<string, never>>;
    isDonation: boolean;
    donation: { isRecurring: boolean } | null;
    tags: string[];
  };
}

function mockTransactionIcon(transaction: MockTransactionType): string {
  if (transaction?.localHcbCode?.isDonation) {
    return "support";
  } else if (transaction?.feePayment) {
    return "bank-circle";
  } else {
    return "payment-docs";
  }
}

function MockTransactionIcon({
  transaction,
  hideIcon,
}: {
  transaction: MockTransactionType;
  hideIcon?: boolean;
}) {
  if (hideIcon) return null;

  const icon = mockTransactionIcon(transaction);

  if (icon === "paypal") {
    return <FontAwesomeIcon color={palette.muted} icon={faPaypal} size={20} />;
  } else {
    return (
      <Icon
        // @ts-expect-error workaround for hackclub-icons-rn
        glyph={icon}
        color={palette.muted}
        size={20}
      />
    );
  }
}

function MockTransactionComponent({
  transaction,
  top = false,
  bottom = false,
  hideIcon,
  hideMissingReceipt,
  style,
}: ViewProps & {
  transaction: MockTransactionType;
  top?: boolean;
  bottom?: boolean;
  hideIcon?: boolean;
  hideMissingReceipt?: boolean;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hasMissingReceipt =
    transaction?.localHcbCode?.receipts.length === 0 &&
    transaction.amount.cents < 0 &&
    !transaction.feePayment;

  return (
    <View
      style={StyleSheet.compose(
        {
          padding: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor:
            transaction.feePayment || transaction.amount.cents < 0
              ? isDark
                ? "#351921"
                : "#F9E3E7"
              : transaction.amount.cents > 0
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
      <MockTransactionIcon transaction={transaction} hideIcon={hideIcon} />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          color: themeColors.text,
          overflow: "hidden",
          flex: 1,
        }}
      >
        {transaction?.localHcbCode?.memo?.replaceAll(/\s{2,}/g, " ") || ""}
      </Text>
      {hasMissingReceipt && !hideMissingReceipt && (
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
          color: themeColors.text,
        }}
      >
        {renderMoney(transaction?.amount.cents)}
      </Text>
    </View>
  );
}

export default memo(MockTransactionComponent);
