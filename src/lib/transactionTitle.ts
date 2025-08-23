import { match } from "ts-pattern";

import { renderMoney } from "../util";

import Transaction, { TransactionType } from "./types/Transaction";

export function getTransactionTitle(transaction: Transaction): string {
  return match(transaction)
    .with(
      { card_charge: {} },
      (tx) => `Card Charge of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { check: {} },
      (tx) => `Check of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { transfer: {} },
      (tx) => `Transfer of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { donation: {} },
      (tx) => `Donation of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { ach_transfer: {} },
      (tx) => `ACH Transfer of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { check_deposit: {} },
      (tx) => `Check Deposit of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { invoice: {} },
      (tx) => `Invoice of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { expense_payout: {} },
      (tx) => `Expense Payout of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .with(
      { code: TransactionType.BankFee },
      (tx) => `Bank Fee of ${renderMoney(Math.abs(tx.amount_cents))}`,
    )
    .otherwise(() => "Transaction");
}
