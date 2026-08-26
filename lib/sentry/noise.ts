export const IGNORED_ERRORS: (string | RegExp)[] = [
  /Error in sendTokenToIntercom/,
  /Error in loginUnidentifiedUser/,
  /Error in loginUserWithUserAttributes/,
  /Error in setUserJwt/,
  /Error in logout/,

  /ExpoUpdates\.checkForUpdateAsync/,
  /ExpoUpdates\.fetchUpdateAsync/,
  /Failed to download (?:new |)update/i,

  "Network request failed",
  "Network request timed out",
  /^Aborted$/,
  "AbortError",
  /The (?:network|Internet) connection appears to be offline/i,

  /The 'navigation' object hasn't been initialized yet/,
  /Couldn't find a navigation object/,

  /The provided authorization grant .* is invalid, expired, revoked/,

  /Response body is already used/,
  /Activity is null/,
];

const NOISY_BREADCRUMB_MESSAGES = [
  /^SWR fetch error/,
  /^Global SWR error/,
  /componentStack/,
  /^Warning: /,
  /Require cycle:/,
  /VirtualizedList: You have a large list/,
  /Each child in a list should have a unique "key"/,
  /useInsertionEffect must not schedule updates/,
];

export function isNoisyBreadcrumb(message: string | undefined): boolean {
  if (!message) return false;
  return NOISY_BREADCRUMB_MESSAGES.some((pattern) => pattern.test(message));
}

const NOISY_LOG_BODIES = [
  /^Warning: /,
  /Require cycle:/,
  /componentStack/,
  /VirtualizedList: You have a large list/,
  /Each child in a list should have a unique "key"/,
  /^\[Reanimated\]/,
  /^SWR fetch error/,
  /^Global SWR error/,
];

export function isNoisyLog(body: string | undefined): boolean {
  if (!body) return false;
  return NOISY_LOG_BODIES.some((pattern) => pattern.test(body));
}
