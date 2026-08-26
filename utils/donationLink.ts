import { shareUrl } from "@/utils/shareUrl";

export type DonationPrefill = {
  amountCents?: number;
  name?: string;
  email?: string;
  message?: string;
  receivingGoods?: boolean;
};

type RawParam = string | string[] | undefined;

function first(value: RawParam): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw === "" ? undefined : raw;
}

/**
 * `goods` follows the web donation page: absent or "0" means the donation is
 * tax deductible, anything else means the donor is receiving goods.
 */
export function parseDonationPrefill(
  params: Record<string, RawParam>,
): DonationPrefill {
  const amountRaw = first(params.amount);
  const amountCents =
    amountRaw !== undefined && Number.isFinite(Number(amountRaw))
      ? Math.round(Number(amountRaw))
      : undefined;
  const goodsRaw = first(params.goods);

  return {
    amountCents:
      amountCents !== undefined && amountCents > 0 ? amountCents : undefined,
    name: first(params.name),
    email: first(params.email),
    message: first(params.message),
    receivingGoods: goodsRaw === undefined ? undefined : goodsRaw !== "0",
  };
}

export function buildDonationStartUrl(
  orgSlug: string,
  prefill: DonationPrefill,
): string {
  const query = new URLSearchParams();
  if (prefill.name) query.set("name", prefill.name);
  if (prefill.email) query.set("email", prefill.email);
  if (prefill.amountCents !== undefined)
    query.set("amount", String(prefill.amountCents));
  if (prefill.message) query.set("message", prefill.message);
  if (prefill.receivingGoods) query.set("goods", "1");

  const base = shareUrl.donations(orgSlug);
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

/** Turns cents into the keypad's `"$12.34"` entry format. */
export function centsToAmountEntry(cents?: number): string {
  if (cents === undefined || !Number.isFinite(cents) || cents <= 0) return "$";
  return `$${(cents / 100).toFixed(2)}`;
}
