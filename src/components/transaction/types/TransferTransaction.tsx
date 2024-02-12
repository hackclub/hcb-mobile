import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import humanizeString from "humanize-string";
import { View } from "react-native";
import useSWR from "swr";

import { StackParamList } from "../../../lib/NavigatorParamList";
import Organization from "../../../lib/types/Organization";
import { TransactionTransfer } from "../../../lib/types/Transaction";
import User from "../../../lib/types/User";
import { renderMoney, statusColor } from "../../../util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function TransferTransaction({
  transaction: { transfer, ...transaction },
  ...props
}: TransactionViewProps<TransactionTransfer>) {
  const { data: userOrgs } = useSWR<Organization[]>(`/user/organizations`);
  const { data: user } = useSWR<User>("/user");

  const userInFromOrg =
    user?.admin || userOrgs?.some((org) => org.id == transfer.from.id);
  const userInToOrg =
    user?.admin || userOrgs?.some((org) => org.id == transfer.to.id);

  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  return (
    <View>
      <TransactionTitle
        badge={
          <Badge color={statusColor(transfer.status)}>
            {humanizeString(transfer.status)}
          </Badge>
        }
      >
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
            onPress:
              userInFromOrg && transfer.from.id != props.orgId
                ? () =>
                    navigation.navigate("Event", {
                      orgId: transfer.from.id,
                      organization: transfer.from,
                    })
                : undefined,
          },
          {
            label: "To",
            value: transfer.to.name,
            onPress:
              userInToOrg && transfer.to.id != props.orgId
                ? () =>
                    navigation.navigate("Event", {
                      orgId: transfer.to.id,
                      organization: transfer.to,
                    })
                : undefined,
          },
        ]}
      />
    </View>
  );
}
