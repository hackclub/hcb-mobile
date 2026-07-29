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

// A single failed refresh must not end the session — transient failures
// (flaky network, timeouts, 5xx from the token endpoint) are expected on
// mobile. We only give up after this many *consecutive* failures, as a last
// resort against being stuck with a token the server keeps rejecting.
const MAX_CONSECUTIVE_REFRESH_FAILURES = 8;

const TERMINAL_OAUTH_ERRORS = [
  "invalid_grant",
  "invalid_client",
  "unauthorized_client",
] as const;

type TerminalOAuthError = (typeof TERMINAL_OAUTH_ERRORS)[number];

function asTerminalOAuthError(value: unknown): TerminalOAuthError | null {
  return TERMINAL_OAUTH_ERRORS.find((known) => known === value) ?? null;
}

type TokenListener = (tokenResponse: TokenResponse | null) => void;

// Thrown instead of sending a request we know the server will reject. A request
// with no Authorization header is guaranteed to 401, so firing it just turns one
// auth failure into a burst of 401s, SWR errors and retries.
export class UnauthenticatedError extends Error {
  constructor(message = "No valid access token; request not sent") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class TokenManager {
  private tokenResponse: TokenResponse | null = null;
  private codeVerifier: string | undefined;
  private consecutiveRefreshFailures = 0;
  private listeners = new Set<TokenListener>();

  // Lets the UI react the moment the session changes — in particular a forced
  // logout from inside refresh(), which no caller is awaiting.
  subscribe(listener: TokenListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.tokenResponse);
      } catch (error) {
        console.error("[TokenManager] Token listener threw", error);
      }
    }
  }

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
        this.emit();
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
    // Commit to memory FIRST. Refresh tokens rotate (each use revokes the old
    // one), so after a successful refresh the response holds the ONLY valid
    // token. If we persisted first and the SecureStore write threw, we'd keep
    // the old, now-revoked token in memory and discard the rotated one — the
    // next request would then redeem a dead token and get logged out. Updating
    // memory up front means the running session always uses the freshest token
    // even if persistence fails; only a cold start could lose it.
    this.tokenResponse = tokenResponse;
    if (codeVerifier) {
      this.codeVerifier = codeVerifier;
    }
    this.emit();
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
      }
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
      this.consecutiveRefreshFailures = 0;
      refreshPromise = null;
      this.emit();
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

  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokenResponse) {
      return null;
    }

    // Refresh if token is expired or expiring within 5 minutes
    const needsRefresh =
      this.tokenResponse.shouldRefresh() ||
      (this.tokenResponse.expiresIn &&
        this.tokenResponse.issuedAt &&
        (this.tokenResponse.issuedAt + this.tokenResponse.expiresIn) * 1000 <=
          Date.now() + 5 * 60 * 1000);

    if (needsRefresh) {
      const refreshed = await this.refresh();
      return refreshed?.accessToken ?? null;
    }

    return this.tokenResponse.accessToken || null;
  }

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

  async refresh(): Promise<TokenResponse | null> {
    if (!this.tokenResponse?.refreshToken) {
      return null;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

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
          // A malformed/incomplete response is a server anomaly, not proof the
          // refresh token is dead — treat it as transient and keep the session.
          console.warn(
            "[TokenManager] Token refresh returned incomplete response",
            {
              hasAccessToken: !!result.accessToken,
              hasRefreshToken: !!result.refreshToken,
            },
          );
          Sentry.captureMessage("Token refresh returned incomplete response", {
            level: "warning",
          });
          return await this.handleTransientRefreshFailure(
            "incomplete_response",
          );
        }

        this.consecutiveRefreshFailures = 0;
        try {
          await this.save(result, this.codeVerifier);
        } catch (saveError) {
          // The network refresh succeeded and (with rotation) the server has
          // already revoked the old refresh token — `result` is now the only
          // valid token. save() has already committed it to memory, so the
          // running session keeps working; persistence just failed (a cold
          // start could lose it). This must NOT be treated as a refresh
          // failure, or we'd log the user out despite a successful refresh.
          console.error(
            "[TokenManager] Failed to persist rotated tokens; keeping session",
            saveError,
          );
          Sentry.captureException(saveError, {
            level: "error",
            tags: { issue_type: "token_persist_failed" },
          });
        }
        return result;
      } catch (error: unknown) {
        const errorObj = error as {
          code?: string;
          params?: { error?: string };
        };
        const terminalOAuthError = asTerminalOAuthError(
          errorObj.code || errorObj.params?.error,
        );

        // Terminal OAuth errors mean the refresh token can never be used again.
        // Retrying is pointless, so end the session immediately.
        if (terminalOAuthError) {
          console.error(
            "[TokenManager] Token refresh failed with terminal OAuth error",
            {
              oauthError: terminalOAuthError,
              errorName: error instanceof Error ? error.name : "Unknown",
            },
          );
          Sentry.captureException(error, {
            level: "error",
            tags: { oauth_error: terminalOAuthError },
          });
          await this.logout(`oauth_error_${terminalOAuthError}`);
          return null;
        }

        // Everything else (network failure, timeout, 5xx, unknown) is transient.
        // Keep the tokens so the next request can retry instead of forcing a
        // logout on a temporary hiccup.
        console.warn(
          "[TokenManager] Token refresh failed transiently, keeping session",
          {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : "Unknown",
          },
        );
        Sentry.captureException(error, {
          level: "warning",
          tags: { issue_type: "token_refresh_transient_error" },
        });
        return await this.handleTransientRefreshFailure("transient_error");
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  // Records a non-terminal refresh failure. Only logs out if refresh has failed
  // repeatedly in a row, so a single blip never tears down the session.
  private async handleTransientRefreshFailure(
    reason: string,
  ): Promise<TokenResponse | null> {
    this.consecutiveRefreshFailures += 1;
    if (this.consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_FAILURES) {
      console.error(
        "[TokenManager] Token refresh failed repeatedly, logging out",
        { reason, attempts: this.consecutiveRefreshFailures },
      );
      Sentry.captureMessage("Token refresh failed repeatedly", {
        level: "error",
      });
      await this.logout(`repeated_refresh_failure_${reason}`);
    }
    return null;
  }

  async logout(reason?: string): Promise<void> {
    if (this.tokenResponse?.refreshToken) {
      try {
        await revokeAsync(
          {
            clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
            token: this.tokenResponse.refreshToken,
          },
          discovery,
        );
      } catch {
        // Token revocation is non-critical; continue logout regardless
      }
    }

    if (reason) {
      console.error("[TokenManager] Forced logout", { reason });
    }

    refreshPromise = null;
    await this.clear();
  }
}

export const tokenManager = new TokenManager();
