import { router, useSegments } from "expo-router";
import humanizeString from "humanize-string";
import { View } from "react-native";
import useSWR from "swr";

import Organization from "../../../lib/types/Organization";
import { TransactionTransfer } from "../../../lib/types/Transaction";
import User from "../../../lib/types/User";
import { renderMoney, statusColor } from "../../../utils/util";
import Badge from "../../Badge";
import UserMention from "../../UserMention";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function TransferTransaction({
  transaction: { transfer, ...transaction },
  navigation: _navigation,
  ...props
}: TransactionViewProps<TransactionTransfer>) {
  const { data: userOrgs } = useSWR<Organization[]>(`user/organizations`);
  const { data: user } = useSWR<User>("user");
  const segments = useSegments();
  const isInEventsTab = segments.includes("(events)" as never);

  const userInFromOrg =
    user?.admin || userOrgs?.some((org) => org.id == transfer.from.id);
  const userInToOrg =
    user?.admin || userOrgs?.some((org) => org.id == transfer.to.id);

  const handleGrantCardNavigation = () => {
    if (transfer.card_grant_id) {
      router.push({
        pathname: isInEventsTab
          ? "/(events)/card-grants/[id]"
          : "/cards/card-grants/[id]",
        params: { id: transfer.card_grant_id },
      });
    }
  };

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
          descriptionDetail(props.orgId, transaction),
          ...(transfer.sender
            ? [
                {
                  label: "Transferred by",
                  value: <UserMention user={transfer.sender} />,
                },
              ]
            : []),
          ...(transfer.card_grant_id
            ? [
                {
                  label: "Grant Card",
                  value: "View Grant Card",
                  onPress: handleGrantCardNavigation,
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
              (userInFromOrg || user?.auditor) &&
              transfer.from.id != props.orgId
                ? () =>
                    router.push({
                      pathname: "/(events)/[id]",
                      params: { id: transfer.from.id },
                    })
                : undefined,
          },
          {
            label: "To",
            value: transfer.to.name,
            onPress:
              (userInToOrg || user?.auditor) && transfer.to.id != props.orgId
                ? () =>
                    router.push({
                      pathname: "/(events)/[id]",
                      params: { id: transfer.to.id },
                    })
                : undefined,
          },
        ]}
      />
    </View>
  );
}
