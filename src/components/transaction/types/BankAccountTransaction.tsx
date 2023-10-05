import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
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
        {renderMoney(transaction.amount_cents)} <Muted>transaction</Muted>
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Transaction date", value: renderDate(transaction.date) },
        ]}
      />
    </View>
  );
}
