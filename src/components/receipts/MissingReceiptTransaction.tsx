import { useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";
import { memo, useState } from "react";
import { TouchableOpacity, View, Text, ActivityIndicator } from "react-native";

import Organization from "../../lib/types/Organization";
import { TransactionCardCharge } from "../../lib/types/Transaction";
import p from "../../styles/palette";
import { palette } from "../../styles/theme";
import { renderMoney } from "../../utils/util";
import UploadIcon from "../icons/UploadIcon";
import { useReceiptActionSheet } from "../ReceiptActionSheet";

function MissingReceiptTransaction({
  transaction,
  onComplete,
  _onUpload,
  onSelect,
}: {
  transaction: TransactionCardCharge & { organization: Organization };
  onComplete: () => void;
  _onUpload: (
    transaction: TransactionCardCharge & { organization: Organization },
  ) => void;
  onSelect: (
    transaction: TransactionCardCharge & { organization: Organization },
  ) => void;
}) {
  const { colors: themeColors } = useTheme();
  const [loading, setLoading] = useState(false);

  const { handleActionSheet, isOnline } = useReceiptActionSheet({
    orgId: transaction.organization.id,
    transactionId: transaction.id,
    onUploadComplete: () => {
      setLoading(false);
      onComplete();
    },
  });

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 16,
              fontWeight: "500",
              marginBottom: 4,
            }}
          >
            {transaction.memo}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              {renderMoney(Math.abs(transaction.amount_cents))}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>•</Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              {formatDistanceToNow(new Date(transaction.card_charge.spent_at))}{" "}
              ago
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginLeft: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: p.sky["500"],
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleActionSheet}
            disabled={!isOnline || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <UploadIcon size={26} color="white" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: p.rose["500"],
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(transaction);
            }}
            disabled={!isOnline || loading}
          >
            <Icon glyph="payment-docs" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default memo(MissingReceiptTransaction);
