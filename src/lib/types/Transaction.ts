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

export default interface Transaction {
  id: string;
  date: string;
  amount_cents: number;
  memo: string;
  pending: boolean;
  code: TransactionType;
}
