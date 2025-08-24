import Card from "./Card";
import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export enum TransactionType {
  Unknown = "000",
  Invoice = "100",
  Donation = "200",
  PartnerDonation = "201",
  AchTransfer = "300",
  Wire = "310",
  Paypal = "350",
  Wise = "360",
  Check = "400",
  IncreaseCheck = "401",
  CheckDeposit = "402",
  Disbursement = "500",
  StripeCard = "600",
  StripeForceCapture = "601",
  BankFee = "700",
  IncomingBankFee = "701",
  FeeRevenue = "702",
  ExpensePayout = "710",
  AchPayment = "800",
}

export interface TransactionBase
  extends Omit<HcbApiObject<"txn">, "created_at"> {
  date: string;
  amount_cents: number;
  memo: string;
  has_custom_memo: boolean;
  pending: boolean;
  declined: boolean;
  code: TransactionType;
  missing_receipt: boolean;
  appearance?: "hackathon_grant" | string;
  _debug?: {
    hcb_code: string;
  };
}

export interface CardCharge {
  merchant: {
    name: string;
    smart_name?: string;
    country: string;
    network_id: string;
  };
  charge_method?: "keyed_in" | "swipe" | "chip" | "contactless" | "online";
  spent_at: string;
  wallet?: "apple_pay" | "google_pay" | "samsung_pay";
  card: Card & { user: User };
}

export interface TransactionCardCharge extends TransactionBase {
  code: TransactionType.StripeCard | TransactionType.StripeForceCapture;
  card_charge: CardCharge;
}

export interface Donation {
  recurring: boolean;
  donor: {
    name: string;
    email: string;
    recurring_donor_id?: string;
  };
  attribution: {
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  message?: string;
  donated_at: string;
  refunded: boolean;
}

export interface TransactionDonation extends TransactionBase {
  code: TransactionType.Donation;
  donation: Donation;
}

export interface Check {
  recipient_name: string;
  recipient_email?: string;
  memo: string;
  payment_for: string;
  status?:
    | "pending_approval"
    | "rejected"
    | "processing"
    | "on_the_way"
    | "deposited"
    | "canceled"
    | "returned";
  sender?: User;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  check_number?: string;
}

export interface TransactionCheck extends TransactionBase {
  code: TransactionType.Check | TransactionType.IncreaseCheck;
  check: Check;
}

export interface Transfer extends HcbApiObject<"xfr"> {
  from: Organization;
  to: Organization;
  sender?: User;
  memo: string;
  status: "pending" | "completed" | "rejected";
  amount_cents: number;
  transaction_id: TransactionBase["id"];
  card_grant_id?: string;
}

export interface TransactionTransfer extends TransactionBase {
  code: TransactionType.Disbursement;
  transfer: Transfer;
}

export interface AchTransfer {
  recipient_name: string;
  recipient_email?: string;
  bank_name: string;
  account_number_last4?: string;
  routing_number?: string;
  payment_for: string;
  sender?: User;
}

export interface TransactionAchTransfer extends TransactionBase {
  code: TransactionType.AchTransfer;
  ach_transfer: AchTransfer;
}

export interface Invoice {
  id: string;
  amount_cents: number;
  sent_at: string;
  paid_at?: string;
  description: string;
  due_date: string;
  sponsor: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TransactionInvoice extends TransactionBase {
  code: TransactionType.Invoice;
  invoice: Invoice;
}

export interface CheckDeposit {
  status: "pending" | "rejected" | "returned" | "deposited";
  front_url: string;
  back_url: string;
  submitter: User;
}

export interface TransactionCheckDeposit extends TransactionBase {
  code: TransactionType.CheckDeposit;
  check_deposit: CheckDeposit;
}

export interface ExpensePayout {
  report_id: string;
}

export interface TransactionExpensePayout extends TransactionBase {
  code: TransactionType.ExpensePayout;
  expense_payout: ExpensePayout;
}

// |
// |
// v this is cool, i should finish this
//
// type SpecificTransaction<Code extends TransactionType, Key extends string, Obj> = TransactionBase & {code: Code; } & {[k in Key]: Obj}

type Transaction =
  | TransactionCheckDeposit
  | TransactionInvoice
  | TransactionAchTransfer
  | TransactionTransfer
  | TransactionCheck
  | TransactionDonation
  | TransactionCardCharge
  | TransactionExpensePayout
  | TransactionBase;

export type TransactionWithoutId = Omit<Transaction, "id"> & {
  id?: Transaction["id"];
};

export default Transaction;
