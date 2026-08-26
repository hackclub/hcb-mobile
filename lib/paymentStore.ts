import { PaymentIntent } from "@stripe/stripe-terminal-react-native";

import { TerminalErrorCopy } from "@/lib/stripeTerminalErrors";

export type CollectPaymentResult = {
  success: boolean;
  error?: TerminalErrorCopy;
};

export type PaymentData = {
  paymentIntent: PaymentIntent.Type;
  collectPayment: () => Promise<CollectPaymentResult>;
  name: string;
  email: string;
  slug: string;
  message?: string;
  receivingGoods?: boolean;
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
