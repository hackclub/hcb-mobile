import * as Sentry from "@sentry/react-native";
import {
  refreshAsync,
  revokeAsync,
  TokenResponse,
  type DiscoveryDocument,
} from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import React, { useState, useEffect, useCallback } from "react";

import AuthContext from "./auth";
import { migrateLegacyTokens, clearLegacyTokens } from "./migration";

const TOKEN_RESPONSE_KEY = "auth_token_response";
const CODE_VERIFIER_KEY = "auth_code_verifier";

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};

let refreshPromise: Promise<{
  success: boolean;
  newTokenResponse?: TokenResponse;
}> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenResponse, setTokenResponseState] = useState<TokenResponse | null>(
    null,
  );
  const [codeVerifier, setCodeVerifierState] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTokenResponse = async () => {
      try {
        // Try new format first
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
          try {
            const tokenData = JSON.parse(tokenResponseStr);

            Sentry.setContext("token_load", {
              hasStoredRefreshToken: !!tokenData.refreshToken,
              storedRefreshTokenLength: tokenData.refreshToken?.length,
              storedRefreshTokenPreview: tokenData.refreshToken
                ? `${tokenData.refreshToken.substring(0, 8)}...${tokenData.refreshToken.substring(tokenData.refreshToken.length - 4)}`
                : "missing",
              hasStoredAccessToken: !!tokenData.accessToken,
              storedAccessTokenLength: tokenData.accessToken?.length,
              storedTokenKeys: Object.keys(tokenData),
              hasExpiresIn: !!tokenData.expiresIn,
              hasIssuedAt: !!tokenData.issuedAt,
            });

            const loadedTokenResponse = new TokenResponse(tokenData);

            const refreshTokenLost =
              tokenData.refreshToken && !loadedTokenResponse.refreshToken;

            Sentry.setContext("token_response_after_load", {
              hasRefreshToken: !!loadedTokenResponse.refreshToken,
              refreshTokenLength: loadedTokenResponse.refreshToken?.length,
              refreshTokenPreview: loadedTokenResponse.refreshToken
                ? `${loadedTokenResponse.refreshToken.substring(0, 8)}...${loadedTokenResponse.refreshToken.substring(loadedTokenResponse.refreshToken.length - 4)}`
                : "missing",
              hasAccessToken: !!loadedTokenResponse.accessToken,
              refreshTokenLost: refreshTokenLost,
              refreshTokenPropertyExists: "refreshToken" in loadedTokenResponse,
            });

            if (refreshTokenLost) {
              Sentry.captureMessage(
                "CRITICAL: RefreshToken lost during TokenResponse construction",
                {
                  level: "error",
                  tags: {
                    issue_type: "token_refresh_token_lost",
                  },
                },
              );
            }

            Sentry.addBreadcrumb({
              message: "Token loaded from SecureStore",
              level: "info",
              data: {
                refreshTokenPreserved: !refreshTokenLost,
                hasRefreshToken: !!loadedTokenResponse.refreshToken,
              },
            });

            setTokenResponseState(loadedTokenResponse);
            if (codeVerifierStr) {
              setCodeVerifierState(codeVerifierStr);
            }
            setIsLoading(false);
            return;
          } catch (parseError) {
            console.error("Failed to parse stored token response", parseError, {
              action: "token_parse",
            });
            Sentry.captureException(parseError, {
              tags: { action: "token_parse" },
              contexts: {
                token_load: {
                  error: "parse_failed",
                },
              },
            });
            // Clear invalid token data
            await SecureStore.deleteItemAsync(TOKEN_RESPONSE_KEY);
            await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
          }
        }

        // Migrate from legacy format if new format not found
        const migration = await migrateLegacyTokens();
        if (migration.tokenResponse) {
          setTokenResponseState(migration.tokenResponse);
          if (migration.codeVerifier) {
            setCodeVerifierState(migration.codeVerifier);
          }

          // Save in new format and clean up legacy keys
          const tokenData = {
            accessToken: migration.tokenResponse.accessToken,
            refreshToken: migration.tokenResponse.refreshToken,
            expiresIn: migration.tokenResponse.expiresIn,
            issuedAt: migration.tokenResponse.issuedAt,
            tokenType: migration.tokenResponse.tokenType,
            scope: migration.tokenResponse.scope,
          };
          await SecureStore.setItemAsync(
            TOKEN_RESPONSE_KEY,
            JSON.stringify(tokenData),
            {
              keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
            },
          );
          if (migration.codeVerifier) {
            await SecureStore.setItemAsync(
              CODE_VERIFIER_KEY,
              migration.codeVerifier,
              {
                keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
              },
            );
          }
          await clearLegacyTokens();
        }
      } catch (error) {
        console.error("Failed to load auth token response", error, {
          action: "token_load",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTokenResponse();
  }, []);

  const setTokenResponse = async (
    newTokenResponse: TokenResponse | null,
    newCodeVerifier?: string,
  ) => {
    try {
      if (newTokenResponse) {
        const tokenData = {
          accessToken: newTokenResponse.accessToken,
          refreshToken: newTokenResponse.refreshToken,
          expiresIn: newTokenResponse.expiresIn,
          issuedAt: newTokenResponse.issuedAt,
          tokenType: newTokenResponse.tokenType,
          scope: newTokenResponse.scope,
        };
        await SecureStore.setItemAsync(
          TOKEN_RESPONSE_KEY,
          JSON.stringify(tokenData),
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        if (newCodeVerifier) {
          await SecureStore.setItemAsync(CODE_VERIFIER_KEY, newCodeVerifier, {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          });
          setCodeVerifierState(newCodeVerifier);
        }
        setTokenResponseState(newTokenResponse);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_RESPONSE_KEY);
        await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
        setTokenResponseState(null);
        setCodeVerifierState(undefined);
      }
    } catch (error) {
      console.error("Failed to save auth token response", error, {
        action: "token_save",
      });
    }
  };

  const forceLogout = async () => {
    if (tokenResponse?.refreshToken) {
      try {
        await revokeAsync(
          {
            clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
            token: tokenResponse.refreshToken,
          },
          discovery,
        );
      } catch {
        // Ignore - we still want to clear local state
      }
    }
    await setTokenResponse(null);
    refreshPromise = null;
  };

  const refreshAccessToken = async (): Promise<{
    success: boolean;
    newTokenResponse?: TokenResponse;
  }> => {
    if (refreshPromise) return refreshPromise;

    const currentRefreshToken = tokenResponse?.refreshToken;
    const currentCodeVerifier = codeVerifier;

    Sentry.setContext("token_refresh_attempt", {
      hasTokenResponse: !!tokenResponse,
      hasRefreshToken: !!currentRefreshToken,
      refreshTokenLength: currentRefreshToken?.length,
      refreshTokenPreview: currentRefreshToken
        ? `${currentRefreshToken.substring(0, 8)}...${currentRefreshToken.substring(currentRefreshToken.length - 4)}`
        : "missing",
      tokenResponseKeys: tokenResponse ? Object.keys(tokenResponse) : [],
      refreshTokenInObject: tokenResponse && "refreshToken" in tokenResponse,
      hasClientId: !!process.env.EXPO_PUBLIC_CLIENT_ID,
    });

    if (!currentRefreshToken) {
      Sentry.captureMessage(
        "Token refresh failed: No refresh token available",
        {
          level: "error",
          tags: {
            issue_type: "token_refresh_missing_token",
          },
        },
      );
      await forceLogout();
      return { success: false };
    }

    return (refreshPromise = (async () => {
      try {
        Sentry.addBreadcrumb({
          message: "Starting token refresh",
          level: "info",
          data: {
            refreshTokenLength: currentRefreshToken.length,
            hasClientId: !!process.env.EXPO_PUBLIC_CLIENT_ID,
          },
        });

        const result = await refreshAsync(
          {
            clientId: process.env.EXPO_PUBLIC_CLIENT_ID!,
            refreshToken: currentRefreshToken,
          },
          discovery,
        );

        if (!result.accessToken || !result.refreshToken) {
          Sentry.captureMessage("Token refresh returned incomplete response", {
            level: "error",
            tags: {
              issue_type: "token_refresh_incomplete",
            },
            contexts: {
              refresh_response: {
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
              },
            },
          });
          await forceLogout();
          return { success: false };
        }

        Sentry.addBreadcrumb({
          message: "Token refresh successful",
          level: "info",
          data: {
            hasNewAccessToken: !!result.accessToken,
            hasNewRefreshToken: !!result.refreshToken,
            newRefreshTokenLength: result.refreshToken.length,
          },
        });

        await setTokenResponse(result, currentCodeVerifier);
        return { success: true, newTokenResponse: result };
      } catch (error: unknown) {
        // expo-auth-session TokenError has the error code in error.code or error.params?.error
        const errorObj = error as {
          code?: string;
          params?: { error?: string };
          error?: string;
        };
        const oauthError =
          errorObj.code || errorObj.params?.error || errorObj.error;

        // Capture full error context in Sentry
        Sentry.setContext("token_refresh_error", {
          oauthError,
          errorCode: errorObj.code,
          errorParams: errorObj.params,
          refreshTokenLength: currentRefreshToken.length,
          refreshTokenPreview: `${currentRefreshToken.substring(0, 8)}...${currentRefreshToken.substring(currentRefreshToken.length - 4)}`,
        });

        if (
          oauthError === "invalid_grant" ||
          oauthError === "invalid_client" ||
          oauthError === "unauthorized_client"
        ) {
          Sentry.captureException(error, {
            level: "error",
            tags: {
              issue_type: "token_refresh_oauth_error",
              oauth_error: oauthError,
            },
            contexts: {
              token_refresh: {
                oauthError,
                refreshTokenLength: currentRefreshToken.length,
              },
            },
          });
          await forceLogout();
          return { success: false };
        }

        Sentry.captureException(error, {
          level: "error",
          tags: {
            issue_type: "token_refresh_unknown_error",
          },
        });
        console.error("Token refresh failed", error);
        return { success: false };
      } finally {
        refreshPromise = null;
      }
    })());
  };

  const shouldRefreshToken = useCallback(
    (leewaySeconds: number = 300): boolean => {
      if (!tokenResponse) return false;

      try {
        if (tokenResponse.shouldRefresh()) return true;

        if (tokenResponse.expiresIn && tokenResponse.issuedAt) {
          const expiresAt =
            (tokenResponse.issuedAt + tokenResponse.expiresIn) * 1000;
          return expiresAt <= Date.now() + leewaySeconds * 1000;
        }

        return false;
      } catch {
        return false;
      }
    },
    [tokenResponse],
  );

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        tokenResponse,
        codeVerifier,
        setTokenResponse,
        refreshAccessToken,
        shouldRefreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
