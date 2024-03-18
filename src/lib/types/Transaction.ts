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
  Check = "400",
  IncreaseCheck = "401",
  CheckDeposit = "402",
  Disbursement = "500",
  StripeCard = "600",
  StripeForceCapture = "601",
  BankFee = "700",
  IncomingBankFee = "701",
  FeeRevenue = "702",
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
  appearance: "hackathon_grant" | string;
}

export interface CardCharge {
  merchant: {
    name: string;
    country: string;
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
  donated_at: string;
  refunded: boolean;
}

export interface TransactionDonation extends TransactionBase {
  code: TransactionType.Donation;
  donation: Donation;
}

export interface Check {
  recipient_name: string;
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
}

export interface TransactionTransfer extends TransactionBase {
  code: TransactionType.Disbursement;
  transfer: Transfer;
}

// |
// |
// v this is cool, i should finish this
//
// type SpecificTransaction<Code extends TransactionType, Key extends string, Obj> = TransactionBase & {code: Code; } & {[k in Key]: Obj}

type Transaction =
  | TransactionTransfer
  | TransactionCheck
  | TransactionDonation
  | TransactionCardCharge
  | TransactionBase;

export type TransactionWithoutId = Omit<Transaction, "id"> & {
  id?: Transaction["id"];
};

export default Transaction;
