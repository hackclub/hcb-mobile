import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { TransactionDonation } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import Badge from "../../Badge";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function DonationTransaction({
  transaction: { donation, ...transaction },
  navigation,
  ...props
}: TransactionViewProps<TransactionDonation>) {
  return (
    <View>
      <TransactionTitle
        badge={
          donation.refunded && <Badge color={palette.warning}>Refunded</Badge>
        }
      >
        {renderMoney(transaction.amount_cents)} <Muted>donation from</Muted>{" "}
        {donation.donor.name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          descriptionDetail(props.orgId, transaction, navigation),
          { label: "Donor email", value: donation.donor.email },
        ]}
      />
      {donation.recurring && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <Ionicons name="refresh-circle" size={20} color={palette.muted} />
          <Text style={{ color: palette.muted }}>
            This donation repeats every month.
          </Text>
        </View>
      )}
    </View>
  );
}
