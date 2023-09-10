export default interface Transaction {
  id: string;
  date: string;
  amount_cents: number;
  memo: string;
  pending: boolean;
  code:
    | "000"
    | "100"
    | "200"
    | "201"
    | "300"
    | "400"
    | "401"
    | "402"
    | "500"
    | "600"
    | "601"
    | "700"
    | "701"
    | "702"
    | "800";
}
