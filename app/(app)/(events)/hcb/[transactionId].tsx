import { useLocalSearchParams } from "expo-router";

import TransactionPage from "@/app/(app)/(events)/[id]/transactions/[transactionId]";

/**
 * Handles `hcb.hackclub.com/hcb/<id>` — the canonical transaction permalink the
 * app itself hands out via `shareUrl.transaction`, which strips the `txn_`
 * prefix. Nothing matched this path before, so `+not-found` bounced every
 * shared transaction link straight back out to the browser.
 *
 * `(app)` and `(events)` are route groups, so they contribute nothing to the
 * URL and this file serves `/hcb/<id>` while still inheriting the events Stack
 * (header, back button, theme).
 *
 * No `orgId` is passed: the permalink carries no org context, and the detail
 * screen already falls back to the top-level `transactions/<id>` endpoint,
 * whose response embeds the organization it needs.
 */
export default function Page() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();

  return <TransactionPage data={{ transactionId: `txn_${transactionId}` }} />;
}
