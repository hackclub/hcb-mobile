import type { ScopedMutator } from "swr/_internal";

/**
 * Every SWR key whose payload embeds receipt-derived state, invalidated in one
 * place.
 *
 * Receipt writes fan out further than they look. Uploading one receipt changes:
 *   - `receipts` — the receipt bin carousel
 *   - `user/transactions/missing_receipt` — the Receipts tab list *and* its
 *     badge count
 *   - `organizations/{org}/transactions/{tx}/receipts` — the receipt list on
 *     the transaction detail screen (the one that made an upload look lost)
 *   - `organizations/{org}/transactions...` — every transaction list, because
 *     each row carries its own `missing_receipt` flag
 *
 * Call sites used to each invalidate a different subset, which is why an upload
 * could succeed while the screen that prompted it never updated.
 *
 * Matching is substring-based on purpose: `useSWRInfinite` prefixes its page
 * keys (`$inf$organizations/...`), so an anchored `startsWith` silently misses
 * every paginated transaction list.
 */
export function invalidateReceiptCaches(
  mutate: ScopedMutator,
  scope?: { orgId?: string; transactionId?: string },
): Promise<unknown> {
  const { orgId, transactionId } = scope ?? {};

  return mutate((key) => {
    if (typeof key !== "string") return false;

    // The bin, plus reimbursement receipts (`receipts?expense_id=…`).
    if (key === "receipts" || key.startsWith("receipts?")) return true;

    // `user/transactions/missing_receipt` and its paginated variants — this is
    // the Receipts tab list *and* the tab-bar badge count.
    if (key.includes("user/transactions")) return true;

    // Every transaction list and detail for this org. `includes` rather than
    // `startsWith` is load-bearing: useSWRInfinite subscribes to
    // `$inf$organizations/{id}/transactions?limit=35`, and an anchored match
    // misses it entirely — which is why rows kept their missing-receipt badge
    // even after a successful upload.
    if (orgId && key.includes(`organizations/${orgId}/transactions`)) {
      return true;
    }

    // The org-less detail key used when a transaction is opened without an org
    // in scope (`transactions/{id}`, plus its `/receipts` child).
    if (transactionId && key.includes(`transactions/${transactionId}`)) {
      return true;
    }

    // Card transaction lists carry the same missing_receipt flag.
    if (key.includes("cards/") && key.includes("/transactions")) return true;

    return false;
  });
}
