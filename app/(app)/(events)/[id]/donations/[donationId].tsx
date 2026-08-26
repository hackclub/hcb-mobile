import { format } from "date-fns";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ReactElement, useEffect, useMemo } from "react";
import { ScrollView } from "react-native";

import Badge from "@/components/Badge";
import ErrorHandoff from "@/components/ErrorHandoff";
import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import TransactionDetails from "@/components/transaction/TransactionDetails";
import TransactionTitle, {
  Muted,
} from "@/components/transaction/TransactionTitle";
import {
  Donation,
  DonationStatus,
  donationVisibleStatus,
} from "@/lib/types/Donation";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { palette } from "@/styles/theme";
import { capitalize, renderMoney, statusColor } from "@/utils/format";
import { shareUrl } from "@/utils/shareUrl";

const STATUS_LABELS: Record<DonationStatus, string> = {
  deposited: "Deposited",
  in_transit: "In transit",
  refunded: "Refunded",
  failed: "Failed",
};

interface Detail {
  label: string;
  value: ReactElement | string;
  fontFamily?: string;
}

export default function DonationDetailPage() {
  const params = useLocalSearchParams<{
    id: string;
    donationId: string;
    donation?: string;
  }>();
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const headerInset = useHeaderInset();

  const donation = useMemo<Donation | null>(() => {
    if (!params.donation) return null;
    try {
      return JSON.parse(params.donation) as Donation;
    } catch {
      return null;
    }
  }, [params.donation]);

  useEffect(() => {
    navigation.setOptions({
      title: "Donation",
      headerRight: () => (
        <ShareHeaderButton url={shareUrl.donation(params.donationId)} />
      ),
    });
  }, [navigation, params.donationId]);

  if (!donation) {
    return (
      <ErrorHandoff
        message="We couldn't load this donation."
        websiteUrl={shareUrl.donation(params.donationId)}
      />
    );
  }

  const status = donationVisibleStatus(donation);
  const name = donation.donor?.name?.trim() || "Anonymous";
  const pm = donation.payment_method;

  const badge = donation.refunded ? (
    <Badge icon="information-circle-outline" color={palette.primary}>
      Refunded
    </Badge>
  ) : donation.recurring ? (
    <Badge icon="repeat" color={palette.success}>
      Recurring
    </Badge>
  ) : null;

  // --- Donation details ---
  const details: Detail[] = [{ label: "Donor", value: name }];
  if (donation.donor?.email)
    details.push({ label: "Email", value: donation.donor.email });
  details.push({
    label: "Status",
    value: <Badge color={statusColor(status)}>{STATUS_LABELS[status]}</Badge>,
  });
  if (donation.donated_at)
    details.push({
      label: "Donated on",
      value: format(new Date(donation.donated_at), "MMM d, yyyy 'at' h:mm a"),
    });
  if (donation.message)
    details.push({ label: "Message", value: donation.message });

  // --- Payment method ---
  const paymentDetails: Detail[] = [];
  if (pm?.brand)
    paymentDetails.push({
      label: "Card",
      value: pm.last4
        ? `${capitalize(pm.brand)} •••• ${pm.last4}`
        : capitalize(pm.brand),
    });
  if (pm?.exp_month && pm?.exp_year)
    paymentDetails.push({
      label: "Expires",
      value: `${String(pm.exp_month).padStart(2, "0")}/${pm.exp_year}`,
    });
  if (paymentDetails.length === 0 && pm?.type)
    paymentDetails.push({
      label: "Method",
      value: capitalize(pm.type.replace(/_/g, " ")),
    });

  // --- Attribution ---
  const attribution: Detail[] = [];
  const a = donation.attribution;
  if (a?.referrer) attribution.push({ label: "Referrer", value: a.referrer });
  if (a?.utm_source)
    attribution.push({ label: "UTM source", value: a.utm_source });
  if (a?.utm_medium)
    attribution.push({ label: "UTM medium", value: a.utm_medium });
  if (a?.utm_campaign)
    attribution.push({ label: "UTM campaign", value: a.utm_campaign });
  if (a?.utm_term) attribution.push({ label: "UTM term", value: a.utm_term });
  if (a?.utm_content)
    attribution.push({ label: "UTM content", value: a.utm_content });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 24 + headerInset,
        paddingBottom: 40,
      }}
    >
      <TransactionTitle badge={badge}>
        {renderMoney(Math.abs(donation.amount_cents))}{" "}
        <Muted>donation from</Muted>
        {"\n"}
        {name}
      </TransactionTitle>

      <TransactionDetails details={details} />

      {paymentDetails.length > 0 && (
        <TransactionDetails title="Payment Method" details={paymentDetails} />
      )}

      {attribution.length > 0 && (
        <TransactionDetails title="Attribution" details={attribution} />
      )}
    </ScrollView>
  );
}
