import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text, ActivityIndicator } from "react-native";
import useSWR from "swr";

import { StackParamList } from "../../lib/NavigatorParamList";
import Receipt from "../../lib/types/Receipt";
import Transaction from "../../lib/types/Transaction";
import { palette } from "../../theme";

export default function ReceiptList({
  transaction,
}: {
  transaction: Transaction;
}) {
  const { params } = useRoute<RouteProp<StackParamList, "Transaction">>();
  const { data: receipts, isLoading } = useSWR<Receipt[]>(
    `/organizations/${params.orgId}/transactions/${transaction.id}/receipts`,
  );

  const { colors: themeColors } = useTheme();

  return (
    <View>
      <Text
        style={{
          color: palette.muted,
          fontSize: 12,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Receipts
      </Text>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {receipts?.map((receipt) => (
          <Image
            key={receipt.id}
            source={receipt.preview_url}
            style={{
              width: 150,
              height: 200,
              backgroundColor: themeColors.card,
              borderRadius: 8,
            }}
            contentFit="contain"
          />
        ))}
        <View
          style={{
            width: 150,
            height: 200,
            borderRadius: 8,
            backgroundColor: themeColors.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={palette.muted} />
          ) : (
            <>
              <Ionicons
                name="add-circle-outline"
                color={palette.muted}
                size={36}
              />
              <Text style={{ color: palette.muted, marginTop: 10 }}>
                Add Receipt
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
