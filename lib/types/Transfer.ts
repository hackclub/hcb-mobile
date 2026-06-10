import HcbApiObject from "./HcbApiObject";

export type TransferKind =
  | "ach_transfer"
  | "check"
  | "disbursement"
  | "wire"
  | "wise_transfer"
  | "paypal_transfer";

export type TransferStatus = "deposited" | "in_transit" | "canceled";

// Mirrors the web transfers ledger row (events/transfers.html.erb).
// There is no v4 list endpoint for this yet — see MOCK_TRANSFERS usage.
export interface OrgTransfer extends HcbApiObject<"xfr"> {
  kind: TransferKind;
  status: TransferStatus;
  to: string;
  payment_for: string | null;
  amount_cents: number;
}

export function transferStatusText(status: TransferStatus): string {
  switch (status) {
    case "deposited":
      return "Deposited";
    case "in_transit":
      return "In transit";
    case "canceled":
      return "Canceled";
  }
}

export function transferStatusColor(status: TransferStatus): string {
  switch (status) {
    case "deposited":
      return "#33a854";
    case "in_transit":
      return "#338eda";
    case "canceled":
      return "#8c8c8c";
  }
}
