import * as Sentry from "@sentry/react-native";

import { redactUrl } from "./redact";

export type Feature =
  | "auth"
  | "cards"
  | "card-grants"
  | "donations"
  | "invoices"
  | "organizations"
  | "receipts"
  | "reimbursements"
  | "settings"
  | "tags"
  | "transactions"
  | "transfers"
  | "unknown";

const FEATURE_BY_SEGMENT: Record<string, Feature> = {
  login: "auth",
  "card-grants": "card-grants",
  cards: "cards",
  donations: "donations",
  invoices: "invoices",
  receipts: "receipts",
  "receipt-selection": "receipts",
  reimbursements: "reimbursements",
  settings: "settings",
  tags: "tags",
  transactions: "transactions",
  transfer: "transfers",
  transfers: "transfers",
  "(events)": "organizations",
};

const CRITICAL_FEATURES: ReadonlySet<Feature> = new Set<Feature>([
  "transfers",
  "donations",
  "card-grants",
  "invoices",
  "reimbursements",
  "auth",
]);

export function isCriticalFeature(feature: Feature): boolean {
  return CRITICAL_FEATURES.has(feature);
}

export function featureForRoute(route: string | undefined): Feature {
  if (!route) return "unknown";
  const segments = route.split("/").filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const feature = FEATURE_BY_SEGMENT[segments[index]];
    if (feature) return feature;
  }
  return "unknown";
}

export function setBuildContext(options: {
  channel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
}): void {
  Sentry.setTag("app.channel", options.channel ?? "unknown");
  Sentry.setTag(
    "app.update_kind",
    options.isEmbeddedLaunch ? "embedded" : "ota",
  );
  Sentry.setContext("build", {
    channel: options.channel ?? null,
    runtime_version: options.runtimeVersion ?? null,
    update_id: options.updateId ?? null,
  });
}

export function setNetworkContext(options: {
  isOnline: boolean;
  connectionType?: string | null;
  isInternetReachable?: boolean | null;
}): void {
  Sentry.setTag("net.online", options.isOnline ? "yes" : "no");
  if (options.connectionType) {
    Sentry.setTag("net.type", options.connectionType);
  }
  Sentry.setContext("network", {
    online: options.isOnline,
    type: options.connectionType ?? null,
    internet_reachable: options.isInternetReachable ?? null,
  });
}

export type AuthState =
  | "anonymous"
  | "authenticated"
  | "refreshing"
  | "expired";

export function setAuthState(state: AuthState): void {
  Sentry.setTag("auth.state", state);
}

export function setOrganizationContext(
  organization:
    | { id?: string; slug?: string; name?: string; playground_mode?: boolean }
    | null
    | undefined,
): void {
  if (!organization?.id) {
    Sentry.setTag("org.id", undefined);
    Sentry.setTag("org.playground", undefined);
    Sentry.setContext("organization", null);
    return;
  }

  Sentry.setTag("org.id", organization.id);
  Sentry.setTag("org.playground", organization.playground_mode ? "yes" : "no");
  Sentry.setContext("organization", {
    id: organization.id,
    slug: organization.slug ?? null,
    playground_mode: organization.playground_mode ?? false,
  });
}

export function setActiveRoute(route: string | undefined): void {
  const feature = featureForRoute(route);
  Sentry.setTag("screen", route ?? "unknown");
  Sentry.setTag("feature", feature);
}

export function setLastRequestContext(options: {
  method: string;
  url: string;
  route: string;
  status: number | null;
  durationMs?: number;
}): void {
  Sentry.setContext("api_request", {
    method: options.method,
    route: options.route,
    url: redactUrl(options.url),
    status: options.status,
    duration_ms: options.durationMs ?? null,
  });
}
