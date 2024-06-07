import { Text, View } from "react-native";
import useSWR from "swr";

import Organization from "../../../lib/types/Organization";
import { palette } from "../../../theme";
import { renderDate, renderMoney } from "../../../util";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function BankFeeTransaction({
  transaction,
  orgId,
  navigation,
}: TransactionViewProps) {
  const { data: organization } = useSWR<Organization>(`organizations/${orgId}`);

  return (
    <View>
      <TransactionTitle>
        <Muted>Fee payment of</Muted>{" "}
        {renderMoney(Math.abs(transaction.amount_cents))}
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(orgId, transaction, navigation),
          { label: "Charged on", value: renderDate(transaction.date) },
        ]}
      />
      {organization && organization.fee_percentage > 0 && (
        <Text style={{ color: palette.muted, textAlign: "center" }}>
          HCB charges a {Math.round(organization.fee_percentage * 100)}% fiscal
          sponsorship fee on incoming funds.
        </Text>
      )}
    </View>
  );
}
