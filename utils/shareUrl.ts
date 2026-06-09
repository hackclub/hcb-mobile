const BASE = "https://hcb.hackclub.com";

export const shareUrl = {
  org: (slug: string) => `${BASE}/${slug}`,
  transaction: (id: string) => `${BASE}/hcb/${id.slice(4)}`,
  card: (id: string) => `${BASE}/stripe_cards/${id.slice(4)}`,
  cardGrant: (id: string) => `${BASE}/grants/${id.slice(4)}`,
  checkDeposit: (orgSlug: string, id: string) =>
    `${BASE}/${orgSlug}/check-deposits/${id.slice(4)}`,
  invoice: (id: string) => `${BASE}/invoices/${id.slice(4)}`,
  donations: (orgSlug: string) => `${BASE}/donations/start/${orgSlug}`,
};
