import { PaymentIntent } from "@stripe/stripe-terminal-react-native";

export type PaymentData = {
  paymentIntent: PaymentIntent.Type;
  collectPayment: () => Promise<boolean>;
  name: string;
  email: string;
  slug: string;
};

let pendingPayment: PaymentData | null = null;

export function setPaymentData(data: PaymentData) {
  pendingPayment = data;
}

export function getPaymentData(): PaymentData | null {
  return pendingPayment;
}

export function clearPaymentData() {
  pendingPayment = null;
}
