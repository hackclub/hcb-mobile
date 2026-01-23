export const SECURE_STORE_KEYS = [
  { key: "auth_token_response", label: "Token Response", sensitive: true },
  { key: "auth_code_verifier", label: "Code Verifier", sensitive: true },
  { key: "expo_push_token", label: "Expo Push Token", sensitive: false },
  { key: "native_push_token", label: "Native Push Token", sensitive: false },
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
