import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionDonation } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import Badge from "../../Badge";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

export default function DonationTransaction({
  transaction: { donation, ...transaction },
  ...props
}: TransactionViewProps<TransactionDonation>) {
  const navigation =
    useNavigation<NativeStackNavigationProp<StackParamList, "Transaction">>();

  return (
    <View>
      <TransactionTitle badge={<Badge color={palette.warning}>Refunded</Badge>}>
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
