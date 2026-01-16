import { TokenResponse } from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

/**
 * Legacy token storage keys (pre-refactor format)
 * TODO: Remove this entire migration module after all users have migrated
 */
const LEGACY_ACCESS_TOKEN_KEY = "auth_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "auth_refresh_token";
const LEGACY_EXPIRES_AT_KEY = "auth_expires_at";
const LEGACY_TOKEN_CREATED_AT_KEY = "auth_token_created_at";
const LEGACY_CODE_VERIFIER_KEY = "auth_code_verifier";

const KEYCHAIN_OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
} as const;


export async function migrateLegacyTokens(): Promise<{
  tokenResponse: TokenResponse | null;
  codeVerifier: string | undefined;
}> {
  try {
    const legacyAccessToken = await SecureStore.getItemAsync(
      LEGACY_ACCESS_TOKEN_KEY,
      KEYCHAIN_OPTIONS,
    );
    const legacyRefreshToken = await SecureStore.getItemAsync(
      LEGACY_REFRESH_TOKEN_KEY,
      KEYCHAIN_OPTIONS,
    );
    const legacyExpiresAtStr = await SecureStore.getItemAsync(
      LEGACY_EXPIRES_AT_KEY,
      KEYCHAIN_OPTIONS,
    );

    // No legacy tokens found
    if (!legacyAccessToken || !legacyRefreshToken || !legacyExpiresAtStr) {
      return { tokenResponse: null, codeVerifier: undefined };
    }

    // Parse legacy token data
    const expiresAt = parseInt(legacyExpiresAtStr, 10);
    if (isNaN(expiresAt)) {
      console.warn("Invalid legacy expiresAt, clearing legacy tokens");
      await clearLegacyTokens();
      return { tokenResponse: null, codeVerifier: undefined };
    }

    const legacyCreatedAtStr = await SecureStore.getItemAsync(
      LEGACY_TOKEN_CREATED_AT_KEY,
      KEYCHAIN_OPTIONS,
    );
    const createdAt = legacyCreatedAtStr
      ? parseInt(legacyCreatedAtStr, 10)
      : Date.now();

    if (isNaN(createdAt)) {
      console.warn("Invalid legacy createdAt, using current time");
    }

    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
    if (expiresAt <= Date.now() - GRACE_PERIOD_MS) {
      console.log("Legacy token expired beyond grace period, clearing");
      await clearLegacyTokens();
      return { tokenResponse: null, codeVerifier: undefined };
    }

    const expiresIn = Math.floor((expiresAt - createdAt) / 1000);
    const issuedAt = Math.floor(createdAt / 1000);

    const tokenResponse = new TokenResponse({
      accessToken: legacyAccessToken,
      refreshToken: legacyRefreshToken,
      expiresIn,
      issuedAt,
      tokenType: "bearer",
    });

    const codeVerifier = await SecureStore.getItemAsync(
      LEGACY_CODE_VERIFIER_KEY,
      KEYCHAIN_OPTIONS,
    );

    return {
      tokenResponse,
      codeVerifier: codeVerifier || undefined,
    };
  } catch (error) {
    console.error("Failed to migrate legacy tokens", error);
    return { tokenResponse: null, codeVerifier: undefined };
  }
}

export async function clearLegacyTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(LEGACY_EXPIRES_AT_KEY),
      SecureStore.deleteItemAsync(LEGACY_TOKEN_CREATED_AT_KEY),
      SecureStore.deleteItemAsync(LEGACY_CODE_VERIFIER_KEY),
    ]);
  } catch (error) {
    console.error("Failed to clear legacy tokens", error);
  }
}
