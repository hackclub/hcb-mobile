import * as Sentry from "@sentry/react-native";
import { makeRedirectUri } from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import React, { useState, useEffect } from "react";

import AuthContext, { AuthTokens } from "./auth";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const EXPIRES_AT_KEY = "auth_expires_at";
const CODE_VERIFIER_KEY = "auth_code_verifier";
const TOKEN_CREATED_AT_KEY = "auth_token_created_at";

const redirectUri = makeRedirectUri({ scheme: "hcb" });

let refreshPromise: Promise<{
  success: boolean;
  newTokens?: AuthTokens;
}> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        const expiresAtStr = await SecureStore.getItemAsync(EXPIRES_AT_KEY, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        const createdAtStr = await SecureStore.getItemAsync(
          TOKEN_CREATED_AT_KEY,
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });

        if (accessToken && refreshToken && expiresAtStr) {
          const expiresAt = parseInt(expiresAtStr, 10);
          const createdAt = createdAtStr
            ? parseInt(createdAtStr, 10)
            : Date.now();
          setTokensState({
            accessToken,
            refreshToken,
            expiresAt,
            createdAt,
            codeVerifier: codeVerifier || undefined,
          });
        }
      } catch (error) {
        console.error("Failed to load auth tokens", error, {
          action: "token_load",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, []);

  const setTokens = async (newTokens: AuthTokens | null) => {
    try {
      if (newTokens) {
        await SecureStore.setItemAsync(
          ACCESS_TOKEN_KEY,
          newTokens.accessToken,
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        await SecureStore.setItemAsync(
          REFRESH_TOKEN_KEY,
          newTokens.refreshToken,
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        await SecureStore.setItemAsync(
          EXPIRES_AT_KEY,
          newTokens.expiresAt.toString(),
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        await SecureStore.setItemAsync(
          TOKEN_CREATED_AT_KEY,
          newTokens.createdAt.toString(),
          {
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          },
        );
        if (newTokens.codeVerifier) {
          await SecureStore.setItemAsync(
            CODE_VERIFIER_KEY,
            newTokens.codeVerifier,
            {
              keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
            },
          );
        }
        setTokensState(newTokens);
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
        await SecureStore.deleteItemAsync(TOKEN_CREATED_AT_KEY);
        await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
        setTokensState(null);
      }
    } catch (error) {
      console.error("Failed to save auth tokens", error, {
        action: "token_save",
      });
    }
  };

  // Force logout - ensure all tokens are cleared and state is consistent
  const forceLogout = async () => {
    console.log("Forcing logout due to auth failure");
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
      await SecureStore.deleteItemAsync(TOKEN_CREATED_AT_KEY);
      await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);

      setTokensState(null);

      refreshPromise = null;
    } catch (error) {
      console.error("Error during forced logout", error, {
        context: { action: "forced_logout" },
      });
    }
  };

  const refreshAccessToken = async (): Promise<{
    success: boolean;
    newTokens?: AuthTokens;
  }> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    if (refreshPromise) {
      console.log("Token refresh already in progress, using existing promise");
      return refreshPromise;
    }

    const currentRefreshToken = tokens?.refreshToken;
    const currentCodeVerifier = tokens?.codeVerifier;
    const clientId = process.env.EXPO_PUBLIC_CLIENT_ID;

    return (refreshPromise = (async () => {
      try {
        if (!currentRefreshToken) {
          console.warn("Cannot refresh token: No refresh token available");
          await forceLogout();
          return { success: false };
        }

        console.log("Refreshing access token...");

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(
                `Retry attempt ${attempt}/${MAX_RETRIES} for token refresh`,
              );
            }

            const formBody = `grant_type=refresh_token&client_id=${encodeURIComponent(clientId)}&refresh_token=${encodeURIComponent(currentRefreshToken)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_verifier=${encodeURIComponent(currentCodeVerifier ?? "")}`;

            console.log("Attempting refresh with body:", formBody);

            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formBody,
              },
            );

            if (!response.ok) {
              const errorBody = await response.text();
              let shouldRetry = false;
              let errorJson: { error?: string } | null = null;

              try {
                errorJson = JSON.parse(errorBody);
                console.error(
                  "Token refresh error details",
                  new Error(errorJson?.error || "Unknown error"),
                  {
                    action: "token_refresh",
                    errorDetails: errorJson,
                    statusCode: response.status,
                  },
                );

                if (errorJson?.error === "invalid_grant") {
                  console.log(
                    "Refresh token is invalid or already used - forcing logout",
                  );
                  await forceLogout();
                  return { success: false };
                }

                // Retry on server errors or rate limiting
                shouldRetry =
                  response.status >= 500 ||
                  response.status === 429 ||
                  response.status === 503;
              } catch (e) {
                shouldRetry = true;
                if (!(e instanceof SyntaxError)) {
                  Sentry.captureException(e);
                }
              }

              if (shouldRetry && attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                console.log(
                  `Token refresh failed with retryable error, retrying in ${delay}ms...`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }

              if (
                errorJson?.error === "invalid_client" ||
                errorJson?.error === "unauthorized_client"
              ) {
                await forceLogout();
              }

              lastError = new Error(
                `Failed to refresh token: ${response.status} ${response.statusText}`,
              );
              break;
            }

            const data = await response.json();

            if (!data.access_token || !data.refresh_token) {
              console.error(
                "Invalid token response from server",
                new Error("Missing tokens"),
                {
                  action: "token_refresh",
                  response_data: data,
                },
              );

              if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                console.log(`Malformed response, retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }

              lastError = new Error("Invalid token response from server");
              break;
            }

            const expiresAt = Date.now() + (data.expires_in || 7200) * 1000;

            const newTokens = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt,
              createdAt: Date.now(),
              codeVerifier: currentCodeVerifier,
            };

            await setTokens(newTokens);

            console.log("Token refreshed successfully");

            return { success: true, newTokens };
          } catch (error) {
            const isNetworkError =
              error instanceof TypeError ||
              (error instanceof Error &&
                (error.message.includes("network") ||
                  error.message.includes("fetch") ||
                  error.message.includes("Failed to fetch")));

            if (isNetworkError && attempt < MAX_RETRIES) {
              const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
              console.log(
                `Network error during token refresh, retrying in ${delay}ms...`,
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            console.error("Token refresh failed", error, {
              action: "token_refresh",
              attempt,
            });

            if (!isNetworkError) {
              await forceLogout();
            }

            lastError =
              error instanceof Error ? error : new Error(String(error));
            break;
          }
        }

        if (lastError) {
          console.error("Token refresh failed after all retries", lastError);
        }
        return { success: false };
      } finally {
        // Clear the promise immediately when it completes (success or failure)
        // This ensures all concurrent callers get the same result, and prevents
        // new callers from trying to use an already-resolved promise
        refreshPromise = null;
      }
    })());
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        tokens,
        setTokens,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
