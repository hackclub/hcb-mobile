import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionAchTransfer } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function AchTransferTransaction({
  transaction: { ach_transfer, ...transaction },
  orgId,
}: TransactionViewProps<TransactionAchTransfer>) {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  return (
    <View>
      <TransactionTitle
        badge={
          transaction.pending && (
            <Badge icon="information-circle-outline" color={palette.info}>
              Pending
            </Badge>
          )
        }
      >
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        <Muted>transfer to</Muted> {ach_transfer.recipient_name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(orgId, transaction, navigation),
          { label: "Reason", value: ach_transfer.description },
          ...(ach_transfer.sender
            ? [
                {
                  label: "Sent by",
                  value: <UserMention user={ach_transfer.sender} />,
                },
              ]
            : []),
        ]}
      />

      <TransactionDetails
        title="ACH Transfer"
        details={[
          { label: "Name", value: ach_transfer.recipient_name },
          ...(ach_transfer.recipient_email
            ? [
                {
                  label: "Email",
                  value: ach_transfer.recipient_email,
                },
              ]
            : []),
          {
            label: "Account",
            value: `••••${ach_transfer.account_number_last4}`,
            fontFamily: "JetBrains Mono",
          },
          { label: "Bank name", value: ach_transfer.bank_name },
        ]}
      />
    </View>
  );
}
