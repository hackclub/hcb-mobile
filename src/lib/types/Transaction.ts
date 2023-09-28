import Card from "./Card";
import HcbApiObject from "./HcbApiObject";
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

interface TransactionBase extends HcbApiObject<"txn"> {
  date: string;
  amount_cents: number;
  memo: string;
  pending: boolean;
  declined: boolean;
  code: TransactionType;
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
}

export interface TransactionDonation extends TransactionBase {
  code: TransactionType.Donation;
  donation: Donation;
}

type Transaction =
  | TransactionDonation
  | TransactionCardCharge
  | TransactionBase;

export default Transaction;
