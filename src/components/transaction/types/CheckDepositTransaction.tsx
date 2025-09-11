import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { View } from "react-native";

import { TransactionCheckDeposit } from "../../../lib/types/Transaction";
import { renderMoney, statusColor } from "../../../utils/util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function CheckDepositTransaction(
  props: TransactionViewProps<TransactionCheckDeposit>,
) {
  const { colors: themeColors } = useTheme();

  return (
    <View>
      <TransactionTitle
        badge={
          <Badge color={statusColor(props.transaction.check_deposit.status)}>
            {props.transaction.check_deposit.status}
          </Badge>
        }
      >
        Check deposit <Muted>of</Muted>{" "}
        {renderMoney(props.transaction.amount_cents)}
      </TransactionTitle>

      <Image
        source={{ uri: props.transaction.check_deposit.front_url }}
        style={{
          width: "100%",
          height: 150,
          borderRadius: 8,
          marginBottom: 30,
          backgroundColor: themeColors.card,
        }}
        contentFit="cover"
      />

      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, props.transaction, props.navigation),
          {
            label: "Deposited by",
            value: (
              <UserMention user={props.transaction.check_deposit.submitter} />
            ),
          },
        ]}
      />
    </View>
  );
}
