import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, View } from "react-native";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionDonation } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import TransactionDetails from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

export default function DonationTransaction({
  transaction,
}: {
  transaction: TransactionDonation;
  navigation: NativeStackNavigationProp<StackParamList, "Transaction">;
}) {
  return (
    <View>
      <TransactionTitle>
        {renderMoney(transaction.amount_cents)} <Muted>donation from</Muted>{" "}
        {transaction.donation.donor.name}
      </TransactionTitle>
      <TransactionDetails
        details={[
          { label: "Description", value: transaction.memo },
          { label: "Donor email", value: transaction.donation.donor.email },
        ]}
      />
      {transaction.donation.recurring && (
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
