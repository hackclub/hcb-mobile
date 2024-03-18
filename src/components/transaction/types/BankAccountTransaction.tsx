import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function BankAccountTransaction({
  transaction,
  ...props
}: TransactionViewProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  return (
    <View>
      <TransactionTitle>
        <Text
          style={{
            color:
              transaction.amount_cents < 0 ? palette.primary : palette.success,
          }}
        >
          {transaction.amount_cents < 0 ? "-" : "+"}
        </Text>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>{transaction.amount_cents < 0 ? "debit" : "deposit"}</Muted>
      </TransactionTitle>
      <TransactionDetails
        details={[
          { label: "Memo", value: transaction.memo }, // TODO: use original "raw" transaction memo
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
    </View>
  );
}
