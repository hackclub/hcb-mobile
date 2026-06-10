import HcbApiObject from "./HcbApiObject";

export interface Sponsor extends HcbApiObject<"spr"> {
  name: string;
  contact_email: string;
  slug: string;
  event_id: string;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
}

export type InvoiceStatus =
  | "Deposited"
  | "In Transit"
  | "Paid"
  | "Voided"
  | "Refunded"
  | "Archived"
  | "Overdue"
  | "Due soon"
  | "Sent";

export interface OrgInvoice extends HcbApiObject<"inv"> {
  status: InvoiceStatus;
  to: string;
  amount_due: number;
  // Present when the viewer can see full invoice details
  memo?: string;
  due_date?: string;
  item_amount?: number;
  item_description?: string;
  sponsor_id?: string;
}

export function invoiceStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case "Deposited":
    case "Paid":
      return "#33a854";
    case "In Transit":
    case "Sent":
      return "#338eda";
    case "Due soon":
      return "#f5a623";
    case "Overdue":
      return "#ec3750";
    case "Refunded":
      return "#f5a623";
    case "Voided":
    case "Archived":
    default:
      return "#8c8c8c";
  }
}
