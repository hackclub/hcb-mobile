import HcbApiObject from "./HcbApiObject";

export default interface User extends Omit<HcbApiObject<"usr">, "created_at"> {
  name: string;
  email: string;
  avatar?: string;
  admin: boolean;
  auditor: boolean;
  birthday?: string;
  shipping_address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  // Present only when the card-locking receipt-compliance feature is enabled
  // for the user. `locked` is true when their cards are currently locked for
  // overdue receipts; upload a receipt to unlock.
  card_locking?: {
    locked: boolean;
    overdue_receipt_count: number;
  };
}

export interface OrgUser extends User {
  joined_at: string;
  role?: "member" | "manager" | "reader";
}
