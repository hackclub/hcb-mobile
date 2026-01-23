export const SECURE_STORE_KEYS = [
  { key: "auth_token_response", label: "Token Response", sensitive: true },
  { key: "auth_code_verifier", label: "Code Verifier", sensitive: true },
  { key: "expo_push_token", label: "Expo Push Token", sensitive: false },
  { key: "native_push_token", label: "Native Push Token", sensitive: false },
  { key: "auth_access_token", label: "Legacy Access Token", sensitive: true },
  { key: "auth_refresh_token", label: "Legacy Refresh Token", sensitive: true },
  { key: "auth_expires_at", label: "Legacy Expires At", sensitive: false },
  { key: "auth_token_created_at", label: "Legacy Token Created At", sensitive: false },
] as const;

export const ASYNC_STORAGE_KEYS = [
  "biometrics_required",
  "app_theme",
  "review_prompt_data",
  "canceledCardsShown",
  "frozenCardsShown",
  "cardOrder",
  "hasSeenTapToPayBanner",
  "ttpDidOnboarding",
  "lastConnectedOrgId",
  "@promoBannerClicked",
  "isTapToPayEnabled",
  "linking-enabled",
  "organizationOrder",
] as const;
