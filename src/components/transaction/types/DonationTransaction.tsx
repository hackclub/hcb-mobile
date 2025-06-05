import { format } from "date-fns";
import { View } from "react-native";

import { TransactionDonation } from "../../../lib/types/Transaction";
import { palette } from "../../../theme";
import { renderMoney } from "../../../util";
import Badge from "../../Badge";
import TransactionDetails, { descriptionDetail } from "../TransactionDetails";
import TransactionTitle, { Muted } from "../TransactionTitle";

import { TransactionViewProps } from "./TransactionViewProps";

function getAttributionString(
  attribution: TransactionDonation["donation"]["attribution"],
) {
  const parts = [];

  if (attribution.referrer) {
    parts.push(`Referred by: ${attribution.referrer}`);
  }

  const utmParts = [];
  if (attribution.utm_source)
    utmParts.push(`source: ${attribution.utm_source}`);
  if (attribution.utm_medium)
    utmParts.push(`medium: ${attribution.utm_medium}`);
  if (attribution.utm_campaign)
    utmParts.push(`campaign: ${attribution.utm_campaign}`);
  if (attribution.utm_term) utmParts.push(`term: ${attribution.utm_term}`);
  if (attribution.utm_content)
    utmParts.push(`content: ${attribution.utm_content}`);

  if (utmParts.length > 0) {
    parts.push(`UTM: ${utmParts.join(", ")}`);
  }

  return parts.join("\n");
}

export default function DonationTransaction({
  transaction: { donation, ...transaction },
  orgId,
  navigation,
}: TransactionViewProps<TransactionDonation>) {
  const attributionString = getAttributionString(donation.attribution);

  const badge = transaction.pending ? (
    <Badge icon="information-circle-outline" color={palette.info}>
      Pending
    </Badge>
  ) : donation.refunded ? (
    <Badge icon="information-circle-outline" color={palette.primary}>
      Refunded
    </Badge>
  ) : donation.recurring ? (
    <Badge icon="repeat" color={palette.success}>
      Recurring
    </Badge>
  ) : null;

  return (
    <View>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <TransactionTitle badge={badge}>
          {renderMoney(Math.abs(transaction.amount_cents))}{" "}
          <Muted>donation from</Muted>
          {"\n"}
          {donation.donor.name}
        </TransactionTitle>
      </View>
      <TransactionDetails
        details={[
          {
            label: "Donor",
            value: donation.donor.name,
          },
          {
            label: "Email",
            value: donation.donor.email,
          },
          ...(donation.recurring && donation.donor.recurring_donor_id
            ? [
                {
                  label: "Recurring ID",
                  value: donation.donor.recurring_donor_id,
                  fontFamily: "JetBrainsMono-Regular",
                },
              ]
            : []),
          ...(donation.message
            ? [
                {
                  label: "Message",
                  value: donation.message,
                },
              ]
            : []),
          descriptionDetail(orgId, transaction, navigation),
          {
            label: "Donated on",
            value: format(
              new Date(donation.donated_at),
              "MMM d, yyyy 'at' h:mm a",
            ),
          },
          ...(attributionString
            ? [
                {
                  label: "Attribution",
                  value: attributionString,
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}
