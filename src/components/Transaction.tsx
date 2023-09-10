import { View, PlatformColor, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../theme";
import { renderMoney } from "../util";
import TransactionType from "../lib/types/Transaction";

function transactionIcon(
  code: TransactionType["code"]
): React.ComponentProps<typeof Ionicons>["name"] {
  switch (code) {
    case "000":
      return "cash-outline";
    case "200":
      return "heart";
    case "500":
      return "arrow-redo";
    case "600":
      return "card";
    case "700":
      return "remove-circle";
    default:
      return "cash-outline";
  }
}

export default function Transaction({
  transaction,
  top,
  bottom,
}: {
  transaction: TransactionType;
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
        marginHorizontal: 20,
        backgroundColor: palette.darkless,
        borderTopLeftRadius: top == true && 8,
        borderTopRightRadius: top == true && 8,
        borderBottomLeftRadius: bottom == true && 8,
        borderBottomRightRadius: bottom == true && 8,
      }}
    >
      <Ionicons
        name={transactionIcon(transaction.code)}
        color={PlatformColor("systemGray2")}
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
        {transaction.pending && "Pending: "}
        {transaction.memo}
      </Text>
      <Text
        style={{
          marginLeft: "auto",
          paddingLeft: 10,
          color: transaction.amount_cents > 0 ? "#33d6a6" : palette.primary,
        }}
      >
        {renderMoney(transaction.amount_cents)}
      </Text>
    </View>
  );
}
