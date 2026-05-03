import useSWR from "swr";
import { OrganizationExpanded } from "../types/Organization";
import Transaction, {
  TransactionAchTransfer,
  TransactionCheckDeposit,
  TransactionDonation,
  TransactionInvoice,
  TransactionCheck,
  TransactionCardCharge,
  TransactionType,
} from "../types/Transaction";
import Card from "../types/Card";
import GrantCard from "../types/GrantCard";
import Comment from "../types/Comment";
import Invitation from "../types/Invitation";
import Receipt from "../types/Receipt";
import User from "../types/User";

import { ApplicationPolicy } from "./ApplicationPolicy";
import { AchTransferPolicy } from "./AchTransferPolicy";
import { CardGrantPolicy } from "./CardGrantPolicy";
import { CardPolicy } from "./CardPolicy";
import { CheckDepositPolicy } from "./CheckDepositPolicy";
import { CheckPolicy } from "./CheckPolicy";
import { CommentPolicy } from "./CommentPolicy";
import { DonationPolicy } from "./DonationPolicy";
import { InvoicePolicy } from "./InvoicePolicy";
import { OrganizerPositionInvitePolicy } from "./OrganizerPositionInvitePolicy";
import { OrgPolicy } from "./OrgPolicy";
import { ReceiptPolicy } from "./ReceiptPolicy";
import { TransactionPolicy } from "./TransactionPolicy";
import { UserPolicy } from "./UserPolicy";

// ---------------------------------------------------------------------------
// Typed overloads — TypeScript picks the right return type at the call site.
// More specific transaction subtypes must come before the generic Transaction.
// ---------------------------------------------------------------------------

export function usePolicy(record: OrganizationExpanded): OrgPolicy;
export function usePolicy(record: User): UserPolicy;
export function usePolicy(
  record: TransactionCheckDeposit,
  org: OrganizationExpanded,
): CheckDepositPolicy;
export function usePolicy(
  record: TransactionDonation,
  org: OrganizationExpanded,
): DonationPolicy;
export function usePolicy(
  record: TransactionInvoice,
  org: OrganizationExpanded,
): InvoicePolicy;
export function usePolicy(
  record: TransactionAchTransfer,
  org: OrganizationExpanded,
): AchTransferPolicy;
export function usePolicy(
  record: TransactionCheck,
  org: OrganizationExpanded,
): CheckPolicy;
export function usePolicy(
  record: Transaction,
  org: OrganizationExpanded,
): TransactionPolicy;
export function usePolicy(
  record: GrantCard,
  org: OrganizationExpanded,
): CardGrantPolicy;
export function usePolicy(
  record: Card,
  org: OrganizationExpanded,
): CardPolicy;
export function usePolicy(
  record: Comment,
  org: OrganizationExpanded,
): CommentPolicy;
export function usePolicy(
  record: Invitation,
  org?: OrganizationExpanded,
): OrganizerPositionInvitePolicy;
export function usePolicy(
  record: Receipt,
  org?: OrganizationExpanded,
): ReceiptPolicy;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function usePolicy(record: unknown, org?: OrganizationExpanded): unknown {
  const { data: user } = useSWR<User>("user");
  const u = user ?? null;
  const o = org ?? null;

  if (!record || typeof record !== "object" || !("id" in record)) {
    return new ApplicationPolicy(u, record);
  }

  const id = (record as { id: string }).id;
  const prefix = id.split("_")[0];

  switch (prefix) {
    case "org":
      return new OrgPolicy(u, record as OrganizationExpanded);

    case "usr":
      return new UserPolicy(u, record as User);

    case "txn": {
      const txn = record as Transaction;
      switch (txn.code) {
        case TransactionType.CheckDeposit:
          return new CheckDepositPolicy(u, txn as TransactionCheckDeposit, o);
        case TransactionType.Donation:
          return new DonationPolicy(u, txn as TransactionDonation, o);
        case TransactionType.Invoice:
          return new InvoicePolicy(u, (txn as TransactionInvoice).invoice, o);
        case TransactionType.AchTransfer:
          return new AchTransferPolicy(u, txn as TransactionAchTransfer, o);
        case TransactionType.Check:
        case TransactionType.IncreaseCheck:
          return new CheckPolicy(u, txn as TransactionCheck, o);
        default:
          return new TransactionPolicy(u, txn, o);
      }
    }

    case "crd": {
      if ("grant_id" in record) {
        return new CardGrantPolicy(u, record as GrantCard, o);
      }
      return new CardPolicy(u, record as Card, o);
    }

    case "cmt":
      return new CommentPolicy(u, record as Comment, o);

    case "ivt":
      return new OrganizerPositionInvitePolicy(u, record as Invitation, o);

    case "rct":
      return new ReceiptPolicy(u, record as Receipt, o);

    default:
      return new ApplicationPolicy(u, record);
  }
}
