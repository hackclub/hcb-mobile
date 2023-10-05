import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";
import useSWR from "swr";

import { StackParamList } from "../../../lib/NavigatorParamList";
import Organization from "../../../lib/types/Organization";
import { TransactionTransfer } from "../../../lib/types/Transaction";
import { renderMoney } from "../../../util";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function TransferTransaction({
  transaction: { transfer, ...transaction },
  ...props
}: TransactionViewProps<TransactionTransfer>) {
  const { data: userOrgs } = useSWR<Organization[]>(`/user/organizations`);

  const userInFromOrg = userOrgs?.some((org) => org.id == transfer.from.id);
  const userInToOrg = userOrgs?.some((org) => org.id == transfer.to.id);

  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  return (
    <View>
      <TransactionTitle>
        {renderMoney(Math.abs(transaction.amount_cents))}{" "}
        {props.orgId == transfer.from.id ? (
          <>
            <Muted>transfer to</Muted> {transfer.to.name}
          </>
        ) : (
          <>
            <Muted>transfer from</Muted> {transfer.from.name}
          </>
        )}
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Reason", value: transfer.memo },
          ...(transfer.sender
            ? [
                {
                  label: "Transferred by",
                  value: <UserMention user={transfer.sender} />,
                },
              ]
            : []),
        ]}
      />
      <TransactionDetails
        details={[
          {
            label: "From",
            value: transfer.from.name,
            onPress: userInFromOrg
              ? () =>
                  navigation.navigate("Event", { organization: transfer.from })
              : undefined,
          },
          {
            label: "To",
            value: transfer.to.name,
            onPress: userInToOrg
              ? () =>
                  navigation.navigate("Event", { organization: transfer.to })
              : undefined,
          },
        ]}
      />
    </View>
  );
}
