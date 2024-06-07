import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text, ActivityIndicator } from "react-native";
import Animated, { Easing, withTiming, Layout } from "react-native-reanimated";
import useSWR from "swr";

import { StackParamList } from "../../lib/NavigatorParamList";
import Receipt from "../../lib/types/Receipt";
import Transaction from "../../lib/types/Transaction";
import { palette } from "../../theme";

function ZoomAndFadeIn() {
  "worklet";
  const animations = {
    opacity: withTiming(1, { duration: 300 }),
    transform: [
      {
        scale: withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.back(2)),
        }),
      },
    ],
  };
  const initialValues = {
    opacity: 0,
    transform: [{ scale: 0.5 }],
  };
  return {
    initialValues,
    animations,
  };
}
const transition = Layout.duration(300).easing(Easing.out(Easing.quad));

export default function ReceiptList({
  transaction,
}: {
  transaction: Transaction;
}) {
  const { params } = useRoute<RouteProp<StackParamList, "Transaction">>();
  const { data: receipts, isLoading } = useSWR<Receipt[]>(
    `organizations/${params.orgId}/transactions/${transaction.id}/receipts`,
  );

  const { colors: themeColors } = useTheme();

  return (
    <View style={{ marginBottom: 30 }}>
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
          <Animated.View key={receipt.id} entering={ZoomAndFadeIn}>
            <Image
              source={receipt.preview_url}
              style={{
                width: 150,
                height: 200,
                backgroundColor: themeColors.card,
                borderRadius: 8,
              }}
              contentFit="contain"
            />
          </Animated.View>
        ))}
        <Animated.View
          style={{
            width: 150,
            height: 200,
            borderRadius: 8,
            backgroundColor: themeColors.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          layout={transition}
        >
          {isLoading && !transaction.missing_receipt ? (
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
        </Animated.View>
      </View>
    </View>
  );
}
