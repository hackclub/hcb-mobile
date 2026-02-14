import * as Sentry from "@sentry/react-native";
import {
  refreshAsync,
  revokeAsync,
  TokenResponse,
  type DiscoveryDocument,
} from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

const TOKEN_RESPONSE_KEY = "auth_token_response";
const CODE_VERIFIER_KEY = "auth_code_verifier";

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};

let refreshPromise: Promise<TokenResponse | null> | null = null;

export class TokenManager {
  private tokenResponse: TokenResponse | null = null;
  private codeVerifier: string | undefined;

  async load(): Promise<void> {
    try {
      const tokenResponseStr = await SecureStore.getItemAsync(
        TOKEN_RESPONSE_KEY,
        {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        },
      );
      const codeVerifierStr = await SecureStore.getItemAsync(
        CODE_VERIFIER_KEY,
        {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        },
      );

      if (tokenResponseStr) {
        const tokenData = JSON.parse(tokenResponseStr);
        this.tokenResponse = new TokenResponse(tokenData);
        this.codeVerifier = codeVerifierStr || undefined;
        console.log("[TokenManager] Tokens loaded successfully", {
          hasAccessToken: !!this.tokenResponse.accessToken,
          hasRefreshToken: !!this.tokenResponse.refreshToken,
          expiresIn: this.tokenResponse.expiresIn,
        });
      } else {
        console.log("[TokenManager] No stored tokens found");
      }
    } catch (error) {
      console.error("[TokenManager] Failed to load tokens", error);
      await this.clear();
    }
  }

  async save(
    tokenResponse: TokenResponse,
    codeVerifier?: string,
  ): Promise<void> {
    try {
      const tokenData = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresIn: tokenResponse.expiresIn,
        issuedAt: tokenResponse.issuedAt,
        tokenType: tokenResponse.tokenType,
        scope: tokenResponse.scope,
      };
      await SecureStore.setItemAsync(
        TOKEN_RESPONSE_KEY,
        JSON.stringify(tokenData),
        {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        },
      );
      if (codeVerifier) {
        await SecureStore.setItemAsync(CODE_VERIFIER_KEY, codeVerifier, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        this.codeVerifier = codeVerifier;
      }
      this.tokenResponse = tokenResponse;
      console.log("[TokenManager] Tokens saved successfully", {
        expiresIn: tokenResponse.expiresIn,
        issuedAt: tokenResponse.issuedAt,
      });
    } catch (error) {
      console.error("[TokenManager] Failed to save tokens", error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_RESPONSE_KEY);
      await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
      this.tokenResponse = null;
      this.codeVerifier = undefined;
      refreshPromise = null;
      console.log("[TokenManager] Tokens cleared");
    } catch (error) {
      console.error("[TokenManager] Failed to clear tokens", error);
    }
  }

  getToken(): TokenResponse | null {
    return this.tokenResponse;
  }

  getCodeVerifier(): string | undefined {
    return this.codeVerifier;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokenResponse) {
      console.log("[TokenManager] No token available");
      return null;
    }

    // Check if token needs refresh (5 min before expiry)
    const needsRefresh =
      this.tokenResponse.shouldRefresh() ||
      (this.tokenResponse.expiresIn &&
        this.tokenResponse.issuedAt &&
        (this.tokenResponse.issuedAt + this.tokenResponse.expiresIn) * 1000 <=
          Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      console.log(
        "[TokenManager] Token expired or expiring soon, refreshing...",
      );
      const refreshed = await this.refresh();
      if (refreshed?.accessToken) {
        console.log("[TokenManager] Token refreshed successfully");
        return refreshed.accessToken;
      }
      console.warn(
        "[TokenManager] Token refresh failed, no access token available",
      );
      return null;
    }

    return this.tokenResponse.accessToken || null;
  }

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpired(leewaySeconds: number = 0): boolean {
    if (!this.tokenResponse) return true;

    try {
      if (this.tokenResponse.shouldRefresh()) return true;

      if (this.tokenResponse.expiresIn && this.tokenResponse.issuedAt) {
        const expiresAt =
          (this.tokenResponse.issuedAt + this.tokenResponse.expiresIn) * 1000;
        return expiresAt <= Date.now() + leewaySeconds * 1000;
      }

      return false;
    } catch {
      return true;
    }
  }

  /**
   * Refresh the access token
   */
  async refresh(): Promise<TokenResponse | null> {
    if (!this.tokenResponse?.refreshToken) {
      console.warn("[TokenManager] Cannot refresh: no refresh token available");
      return null;
    }

    // If refresh is already in progress, wait for it
    if (refreshPromise) {
      console.log("[TokenManager] Refresh already in progress, waiting...");
      return refreshPromise;
    }

    console.log("[TokenManager] Starting token refresh...");
    refreshPromise = (async () => {
      try {
        const result = await refreshAsync(
          {
            clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
            refreshToken: this.tokenResponse!.refreshToken!,
          },
          discovery,
        );

        if (!result.accessToken || !result.refreshToken) {
          console.error(
            "[TokenManager] Token refresh returned incomplete response",
            {
              hasAccessToken: !!result.accessToken,
              hasRefreshToken: !!result.refreshToken,
            },
          );
          Sentry.captureMessage("Token refresh returned incomplete response", {
            level: "error",
          });
          await this.logout("incomplete_refresh_response");
          return null;
        }

        await this.save(result, this.codeVerifier);
        console.log("[TokenManager] Token refresh successful");
        return result;
      } catch (error: unknown) {
        const errorObj = error as {
          code?: string;
          params?: { error?: string };
        };
        const oauthError = errorObj.code || errorObj.params?.error;

        if (
          oauthError === "invalid_grant" ||
          oauthError === "invalid_client" ||
          oauthError === "unauthorized_client"
        ) {
          console.error(
            "[TokenManager] Token refresh failed with OAuth error",
            {
              oauthError,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          Sentry.captureException(error, {
            level: "error",
            tags: { oauth_error: oauthError },
          });
          await this.logout(`oauth_error_${oauthError}`);
          return null;
        }

        console.error(
          "[TokenManager] Token refresh failed with unknown error",
          {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : "Unknown",
          },
        );
        Sentry.captureException(error, {
          level: "error",
          tags: { issue_type: "token_refresh_unknown_error" },
        });
        await this.logout("refresh_failed");
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  async logout(reason?: string): Promise<void> {
    console.warn("[TokenManager] Logging out", {
      reason: reason || "unknown",
      timestamp: new Date().toISOString(),
    });

    if (this.tokenResponse?.refreshToken) {
      try {
        console.log("[TokenManager] Revoking refresh token...");
        await revokeAsync(
          {
            clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
            token: this.tokenResponse.refreshToken,
          },
          discovery,
        );
        console.log("[TokenManager] Refresh token revoked successfully");
      } catch (error) {
        console.warn(
          "[TokenManager] Failed to revoke refresh token (non-critical)",
          error,
        );
        // Ignore revocation errors - we still want to clear local state
      }
    }

    refreshPromise = null;
    await this.clear();
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
