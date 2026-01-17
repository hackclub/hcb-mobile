import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity, View, Text, ActivityIndicator } from "react-native";

import { getTransactionTitle } from "../../lib/transactionTitle";
import Card from "../../lib/types/Card";
import Transaction from "../../lib/types/Transaction";
import { palette } from "../../styles/theme";
import TransactionComponent from "../transaction/Transaction";

interface CardTransactionsProps {
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionError: string | null;
  isLoadingMore: boolean;
  card: Card;
  _card: Card;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: NativeStackNavigationProp<any>;
}

export default function CardTransactions({
  transactions,
  transactionsLoading,
  transactionError,
  isLoadingMore,
  card,
  _card,
  navigation,
}: CardTransactionsProps) {
  const { colors: themeColors } = useTheme();

  if (transactionError) {
    return (
      <View
        style={{
          padding: 20,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderRadius: 10,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name="alert-circle" size={24} color="#EF4444" />
        <Text
          style={{
            color: "#EF4444",
            marginVertical: 10,
            textAlign: "center",
          }}
        >
          {transactionError}
        </Text>
      </View>
    );
  }

  if (transactionsLoading) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          height: 150,
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: 15,
        }}
      >
        <ActivityIndicator color={palette.primary} />
        <Text style={{ color: themeColors.text, marginTop: 10 }}>
          Loading transactions...
        </Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 60,
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: 15,
        }}
      >
        <Ionicons name="receipt-outline" size={50} color={palette.muted} />
        <Text
          style={{
            color: palette.muted,
            fontSize: 18,
            fontWeight: "600",
            marginTop: 15,
          }}
        >
          No transactions yet
        </Text>
        <Text
          style={{
            color: palette.muted,
            marginTop: 5,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          Transactions will appear here once this card is used
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: palette.muted,
          }}
        >
          Transaction History
        </Text>
      </View>

      <View style={{ borderRadius: 15, overflow: "hidden" }}>
        {transactions.map((transaction, transactionIndex) => (
          <TouchableOpacity
            key={transaction.id}
            onPress={() => {
              navigation.navigate("Transaction", {
                orgId: card?.organization?.id || _card?.organization?.id,
                transaction: transaction,
                transactionId: transaction.id,
                title: getTransactionTitle(transaction),
              });
            }}
            style={[
              transactionIndex === 0 && {
                borderTopLeftRadius: 15,
                borderTopRightRadius: 15,
              },
              transactionIndex === transactions.length - 1 && {
                borderBottomLeftRadius: 15,
                borderBottomRightRadius: 15,
              },
            ]}
          >
            <TransactionComponent
              transaction={transaction}
              showMerchantIcon={true}
              top={transactionIndex == 0}
              bottom={transactionIndex == transactions.length - 1}
              hideAvatar
              orgId={card?.organization?.id || _card?.organization?.id || ""}
            />
          </TouchableOpacity>
        ))}
      </View>

      {isLoadingMore && (
        <View
          style={{
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={palette.primary} />
        </View>
      )}
    </>
  );
}
