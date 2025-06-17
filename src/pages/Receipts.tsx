import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import useSWR from "swr";

import { useReceiptActionSheet } from "../components/ReceiptActionSheet";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import { TransactionCardCharge } from "../lib/types/Transaction";
import p from "../palette";
import { palette } from "../theme";
import { renderMoney } from "../util";

function Transaction({
  transaction,
  onComplete,
}: {
  transaction: TransactionCardCharge & { organization: Organization };
  onComplete: () => void;
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
    <TouchableHighlight
      underlayColor={themeColors.background}
      onPress={handleActionSheet}
      disabled={!isOnline}
    >
      <View
        style={{
          marginBottom: 16,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: themeColors.card,
          flexDirection: "row",
          alignItems: "stretch",
        }}
      >
        <View style={{ flex: 1, padding: 10, gap: 8 }}>
          <Text style={{ color: themeColors.text }}>{transaction.memo}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Text style={{ color: palette.muted }}>
              {renderMoney(Math.abs(transaction.amount_cents))}
            </Text>
            <Text style={{ color: palette.muted }}>&middot;</Text>
            <Text style={{ color: palette.muted }}>
              {formatDistanceToNow(new Date(transaction.card_charge.spent_at))}{" "}
              ago
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: loading ? p.sky["600"] : p.sky["500"],
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            width: 60,
          }}
        >
          {loading ? (
            <ActivityIndicator color={themeColors.text} />
          ) : (
            <Ionicons
              size={26}
              color={themeColors.text}
              name="camera-outline"
            />
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
}

type Props = NativeStackScreenProps<
  ReceiptsStackParamList,
  "MissingReceiptList"
>;

export default function ReceiptsPage({ navigation: _navigation }: Props) {
  const { data, mutate, isLoading } = useSWR<{
    data: (TransactionCardCharge & { organization: Organization })[];
  }>("user/transactions/missing_receipt");

  useFocusEffect(() => {
    mutate();
  });

  const [refreshing] = useState(false);

  const onRefresh = async () => {
    mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (data?.data?.length == 0) {
    return (
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ marginBottom: 10 }}>
          <Ionicons name="receipt-outline" color={palette.muted} size={60} />
          <Ionicons
            name="checkmark"
            color={p.emerald["400"]}
            size={30}
            style={{
              position: "absolute",
              top: -15,
              left: -15,
            }}
          />
        </View>
        <Text style={{ color: palette.muted }}>No receipts to upload.</Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={data?.data || []}
      renderItem={({ item }) => (
        <Transaction transaction={item} onComplete={() => mutate()} />
      )}
      contentContainerStyle={{ padding: 20 }}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}
