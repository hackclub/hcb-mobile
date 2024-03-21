import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionCardCharge } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import ReceiptList from "../ReceiptList";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function CardChargeTransaction({
  transaction: {
    card_charge: { merchant, ...card_charge },
    ...transaction
  },
  orgId,
}: TransactionViewProps<TransactionCardCharge>) {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  const badge = transaction.pending ? (
    <Badge icon="information-circle-outline" color={palette.info}>
      Pending
    </Badge>
  ) : transaction.declined ? (
    <Badge icon="information-circle-outline" color={palette.primary}>
      Declined
    </Badge>
  ) : null;

  return (
    <View>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <TransactionTitle badge={badge}>
          {renderMoney(Math.abs(transaction.amount_cents))}{" "}
          <Muted>charge at</Muted>
          {"\n"}
          {merchant.smart_name}
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Memo",
            value: merchant.name,
          },
          descriptionDetail(orgId, transaction, navigation),
          { label: "Spent on", value: renderDate(transaction.date) },
          {
            label: "Spent by",
            value: <UserMention user={card_charge.card.user} />,
          },
        ]}
      />
      <ReceiptList transaction={transaction} />
    </View>
  );
}
