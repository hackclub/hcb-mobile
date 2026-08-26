import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Handles `hcb.hackclub.com/donations/start/<slug>` — the public donation link
 * HCB hands out (and the one this app's own QR code encodes). Organizers who
 * open it on a device with the app installed land in the Tap to Pay flow with
 * the form already filled in from the query string.
 *
 * `(app)` and `(events)` are route groups, so this file serves the bare
 * `/donations/start/<slug>` path while inheriting the events Stack, whose
 * anchor keeps the org list underneath as a back target.
 *
 * The v4 API resolves an organization by slug or public id, so the slug goes
 * straight through as `id`.
 */
export default function Page() {
  const { slug, amount, name, email, message, goods } = useLocalSearchParams<{
    slug: string;
    amount?: string;
    name?: string;
    email?: string;
    message?: string;
    goods?: string;
  }>();

  const params: Record<string, string> = { id: slug, orgSlug: slug };
  if (amount) params.amount = amount;
  if (name) params.name = name;
  if (email) params.email = email;
  if (message) params.message = message;
  if (goods) params.goods = goods;

  return (
    <Redirect href={{ pathname: "/(events)/[id]/donations/new", params }} />
  );
}
