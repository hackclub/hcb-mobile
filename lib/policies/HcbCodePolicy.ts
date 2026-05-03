import Transaction from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

/**
 * Policy for HCB codes / individual transaction entries.
 * In mobile, HCB codes map to transactions in the context of an org.
 */
export class HcbCodePolicy extends OrgScopedPolicy<Transaction> {
  override show(): boolean { return this.isAuditor || this.isReader || this.isCardholder; }

  memoFrame(): boolean { return this.isAdmin; }

  override edit(): boolean { return this.isMember; }
  override update(): boolean { return this.isMember; }

  comment(): boolean { return this.isMember; }

  attachReceipt(): boolean { return this.isAdmin || this.isMember || this.isCardholder; }

  sendReceiptSms(): boolean { return this.isAdmin; }

  dispute(): boolean { return this.isMember; }

  pin(): boolean { return this.isMember; }

  toggleTag(): boolean { return this.isMember; }

  invoiceAsPersonalTransaction(): boolean { return this.isMember; }

  linkReceiptModal(): boolean { return this.isMember; }

  receiptableUpload(): boolean { return this.isCardholder; }

  /**
   * Whether the current user is the cardholder for a card-charge transaction.
   * Falls back to false for non-card transactions.
   */
  private get isCardholder(): boolean {
    if ("card_charge" in this.record) {
      return this.record.card_charge.card.user.id === this.user?.id;
    }
    return false;
  }
}
