import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionCheck } from "../../../lib/types/Transaction";
import { renderMoney } from "../../../util";
import UserMention from "../../UserMention";
import TransactionDetails from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

export default function CheckTransaction({
  transaction: { check, ...transaction },
}: {
  transaction: TransactionCheck;
  navigation: NativeStackNavigationProp<StackParamList, "Transaction">;
}) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>check to</Muted> {check.recipient_name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          { label: "Description", value: transaction.memo },
          ...(check.sender
            ? [{ label: "Sent by", value: <UserMention user={check.sender} /> }]
            : []),
        ]}
      />
    </View>
  );
}
