import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionCardCharge } from "../../../lib/types/Transaction";
import { renderDate, renderMoney } from "../../../util";
import UserMention from "../../UserMention";
import TransactionDetails from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

export default function CardChargeTransaction({
  transaction,
}: {
  transaction: TransactionCardCharge;
  navigation: NativeStackNavigationProp<StackParamList, "Transaction">;
}) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>charge at</Muted> {transaction.card_charge.merchant.name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          { label: "Description", value: transaction.memo },
          { label: "Spent on", value: renderDate(transaction.date) },
          {
            label: "Spent by",
            value: <UserMention user={transaction.card_charge.card.user} />,
          },
        ]}
      />
    </View>
  );
}
