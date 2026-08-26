const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /^(?:.*[._-])?(?:access_?token|refresh_?token|id_?token|token|secret|client_?secret|password|passwd|authorization|auth_?header|cookie|set_?cookie|session|api_?key|jwt|cvv|cvc|pin|ssn|tax_?id|ein|routing_?number|account_?number|card_?number|pan|iban|bic|swift_?code|last4|expiry|exp_?month|exp_?year|otp|mfa_?code|verification_?code)$/i;

const SENSITIVE_QUERY_PARAM =
  /^(?:access_token|token|code|api_?key|secret|jwt|password|signature|sig)$/i;

const CARD_NUMBER = /\b\d(?:[ -]?\d){12,18}\b/g;

const JWT =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

const BEARER_HEADER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;

const MAX_DEPTH = 6;

export function redactString(value: string): string {
  return value
    .replace(BEARER_HEADER, (_match, scheme: string) => `${scheme} ${REDACTED}`)
    .replace(JWT, REDACTED)
    .replace(CARD_NUMBER, (match) =>
      match.replace(/[ -]/g, "").length >= 13 ? REDACTED : match,
    );
}

export function redactUrl(raw: string): string {
  const [base, query] = raw.split("?");
  if (!query) return redactString(base);

  const cleaned = query
    .split("&")
    .map((pair) => {
      const separator = pair.indexOf("=");
      if (separator < 0) return pair;
      const key = pair.slice(0, separator);
      return SENSITIVE_QUERY_PARAM.test(key)
        ? `${key}=${REDACTED}`
        : `${key}=${redactString(pair.slice(separator + 1))}`;
    })
    .join("&");

  return `${redactString(base)}?${cleaned}`;
}

export function redactDeep<T>(input: T, depth = 0, seen = new WeakSet()): T {
  if (depth > MAX_DEPTH) return REDACTED as unknown as T;

  if (typeof input === "string") {
    return redactString(input) as unknown as T;
  }

  if (!input || typeof input !== "object") return input;

  if (seen.has(input as object)) return REDACTED as unknown as T;
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map((item) =>
      redactDeep(item, depth + 1, seen),
    ) as unknown as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = REDACTED;
    } else if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      output[key] = redactUrl(value);
    } else {
      output[key] = redactDeep(value, depth + 1, seen);
    }
  }
  return output as unknown as T;
}
