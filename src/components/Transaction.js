import { View, PlatformColor, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "../theme";
import { renderMoney } from "../util";

export default function Transaction({ transaction, top, bottom }) {
  return (
    <View
      style={{
        // borderLeftColor:
        //   item.amount_cents < 0
        //     ? PlatformColor("systemRed")
        //     : PlatformColor("systemGreen"),
        // borderLeftWidth: 3,
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
        name={
          {
            "000": "cash-outline",
            200: "heart",
            500: "arrow-redo",
            600: "card",
            700: "remove-circle",
          }[transaction.code]
        }
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
