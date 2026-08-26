export type ApiErrorKind = "http" | "timeout" | "network" | "aborted";

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  method: string;
  route: string;
  status: number | null;
  url: string | null;
}

const COLLECTIONS = new Set([
  "ach_transfers",
  "announcements",
  "card_grants",
  "cards",
  "checks",
  "check_deposits",
  "comments",
  "disbursements",
  "documents",
  "donations",
  "events",
  "expenses",
  "invoices",
  "organizations",
  "receipts",
  "reports",
  "sponsors",
  "stripe_cards",
  "sub_organizations",
  "tags",
  "transactions",
  "transfers",
  "users",
]);

const OBJECT_ID = /^[a-z]{2,6}_[A-Za-z0-9]{4,}$/;

const HTTP_METHOD = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/;

const MALFORMED_SEGMENT = /^(?:undefined|null|NaN|\[object Object\]|https?:)$/;

export function normalizeApiPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  const normalized = segments.map((segment, index) => {
    if (MALFORMED_SEGMENT.test(segment)) return segment;
    const parent = index > 0 ? segments[index - 1] : undefined;
    if (parent && COLLECTIONS.has(parent)) return "{id}";
    if (OBJECT_ID.test(segment)) return "{id}";
    if (/^\d+$/.test(segment)) return "{id}";
    return segment;
  });

  return `/${normalized.join("/")}`;
}

export function isMalformedRoute(route: string): boolean {
  return route
    .split("/")
    .filter(Boolean)
    .some((segment) => MALFORMED_SEGMENT.test(segment));
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const withoutQuery = url.split("?")[0];
    const afterScheme = withoutQuery.replace(/^[a-z]+:\/\/[^/]+/i, "");
    return afterScheme || withoutQuery;
  }
}

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  request?: { url?: unknown; method?: unknown };
  response?: { status?: unknown };
}

export function describeApiError(error: unknown): ApiErrorInfo | null {
  if (!error || typeof error !== "object") return null;

  const candidate = error as ErrorLike;
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  let kind: ApiErrorKind | null = null;
  if (name === "AbortError" || /^Aborted$/i.test(message)) {
    kind = "aborted";
  } else if (name === "TimeoutError" || /^Request timed out:/.test(message)) {
    kind = "timeout";
  } else if (
    name === "HTTPError" ||
    /^Request failed with status code/.test(message)
  ) {
    kind = "http";
  } else if (/network request (failed|timed out)/i.test(message)) {
    kind = "network";
  }
  if (!kind) return null;

  let url: string | undefined;
  let method: string | undefined;

  const request = candidate.request;
  if (request && typeof request === "object") {
    if (typeof request.url === "string") url = request.url;
    if (typeof request.method === "string") method = request.method;
  }

  if (!url) {
    const fromMessage = message.match(
      /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/,
    );
    if (fromMessage) {
      method = fromMessage[1];
      url = fromMessage[2];
    }
  }

  let status: number | null = null;
  const rawStatus = candidate.response?.status;
  if (typeof rawStatus === "number") {
    status = rawStatus;
  } else {
    const fromMessage = message.match(/status code (\d{3})/);
    if (fromMessage) status = Number(fromMessage[1]);
  }

  const normalizedMethod = (method ?? "").toUpperCase();

  return {
    kind,
    method: HTTP_METHOD.test(normalizedMethod) ? normalizedMethod : "UNKNOWN",
    route: url ? normalizeApiPath(pathnameOf(url)) : "unknown",
    status,
    url: url ?? null,
  };
}

const EXPECTED_HTTP_STATUSES = new Set([401, 403, 404, 409, 410, 422]);

export function isActionableApiError(info: ApiErrorInfo): boolean {
  if (isMalformedRoute(info.route)) return true;
  if (info.kind !== "http") return false;
  if (info.status === null) return false;
  return !EXPECTED_HTTP_STATUSES.has(info.status);
}

export function statusClassOf(status: number | null): string {
  if (status === null) return "unknown";
  return `${Math.floor(status / 100)}xx`;
}
