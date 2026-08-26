import HcbApiObject from "./HcbApiObject";

export interface DonationPaymentMethod {
  type: string | null;
  brand: string | null;
  last4: string | null;
  funding: string | null;
  exp_month: number | null;
  exp_year: number | null;
  country: string | null;
}

// Top-level donation object returned by GET
// organizations/:organization_id/donations (v4). Note this is a superset of
// the donation shape nested inside a transaction — same jbuilder partial, but
// wrapped in `object_shape` so it also carries id / object / created_at.
export interface Donation extends HcbApiObject<"don"> {
  object: "donation";
  amount_cents: number;
  recurring: boolean;
  donor: {
    name: string | null;
    email: string | null;
    recurring_donor_id?: string;
  };
  attribution: {
    referrer?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
  };
  payment_method: DonationPaymentMethod;
  message: string | null;
  donated_at: string;
  refunded: boolean;
  deposited: boolean;
  in_transit: boolean;
}

export interface DonationStats {
  total_cents: number;
}

// Visible states accepted by the `status` filter param. `pending` is excluded
// server-side (`not_pending`), so it is not a valid filter value.
export type DonationStatus = "deposited" | "in_transit" | "refunded" | "failed";

export function donationVisibleStatus(
  donation: Pick<Donation, "refunded" | "deposited" | "in_transit">,
): DonationStatus {
  if (donation.refunded) return "refunded";
  if (donation.deposited) return "deposited";
  if (donation.in_transit) return "in_transit";
  return "failed";
}
