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

let lastSuccessfulRefreshTime = 0;
const MIN_REFRESH_INTERVAL_MS = 5000;

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
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        const expiresAtStr = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
        const createdAtStr =
          await SecureStore.getItemAsync(TOKEN_CREATED_AT_KEY);
        const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);

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
        console.error("Failed to load auth tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, []);

  const setTokens = async (newTokens: AuthTokens | null) => {
    try {
      if (newTokens) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newTokens.accessToken);
        await SecureStore.setItemAsync(
          REFRESH_TOKEN_KEY,
          newTokens.refreshToken,
        );
        await SecureStore.setItemAsync(
          EXPIRES_AT_KEY,
          newTokens.expiresAt.toString(),
        );
        await SecureStore.setItemAsync(
          TOKEN_CREATED_AT_KEY,
          newTokens.createdAt.toString(),
        );
        if (newTokens.codeVerifier) {
          await SecureStore.setItemAsync(
            CODE_VERIFIER_KEY,
            newTokens.codeVerifier,
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
      console.error("Failed to save auth tokens:", error);
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

      lastSuccessfulRefreshTime = 0;
      refreshPromise = null;
    } catch (error) {
      console.error("Error during forced logout:", error);
    }
  };

  const refreshAccessToken = async (): Promise<{
    success: boolean;
    newTokens?: AuthTokens;
  }> => {
    try {
      if (refreshPromise) {
        console.log(
          "Token refresh already in progress, using existing promise",
        );
        return refreshPromise;
      }

      if (!tokens?.refreshToken) {
        console.warn("Cannot refresh token: No refresh token available");
        await forceLogout();
        return { success: false };
      }

      // Validate client ID
      if (!process.env.EXPO_PUBLIC_CLIENT_ID) {
        console.error(
          "Cannot refresh token: EXPO_PUBLIC_CLIENT_ID environment variable is not set",
        );
        await forceLogout();
        return { success: false };
      }

      const now = Date.now();
      const timeSinceLastRefresh = now - lastSuccessfulRefreshTime;
      if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL_MS) {
        console.log(
          `Skipping token refresh - last refresh was ${timeSinceLastRefresh}ms ago (minimum interval: ${MIN_REFRESH_INTERVAL_MS}ms)`,
        );
        return { success: true, newTokens: tokens };
      }

      console.log("Client ID:", process.env.EXPO_PUBLIC_CLIENT_ID);
      console.log("Redirect URI:", redirectUri);

      const tokenAge = now - (tokens.createdAt || 0);

      const isTokenExpired = tokens.expiresAt <= now + 5 * 60 * 1000;

      if (tokenAge < 10000 && !isTokenExpired) {
        console.log(
          `Token was just created ${tokenAge}ms ago and isn't expired, skipping refresh`,
        );
        return { success: true, newTokens: tokens };
      }

      if (tokens.expiresAt > now + 5 * 60 * 1000) {
        console.log("Token is still valid, no need to refresh");
        return { success: true, newTokens: tokens };
      }

      console.log("Refreshing access token...");

      refreshPromise = (async () => {
        try {
          const formBody = `grant_type=refresh_token&client_id=${encodeURIComponent(process.env.EXPO_PUBLIC_CLIENT_ID!)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_verifier=${encodeURIComponent(tokens.codeVerifier ?? "")}`;

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
            console.error(
              `Token refresh failed with status ${response.status}: ${errorBody}`,
            );

            try {
              const errorJson = JSON.parse(errorBody);
              console.error("Error details:", errorJson);

              if (errorJson.error === "invalid_grant") {
                console.log(
                  "Refresh token is invalid or already used - forcing logout",
                );
                await forceLogout();
              }
            } catch (e) {
              Sentry.captureException(e);
            }

            await forceLogout();
            throw new Error(
              `Failed to refresh token: ${response.status} ${response.statusText}`,
            );
          }

          const data = await response.json();

          if (!data.access_token || !data.refresh_token) {
            console.error("Invalid token response:", data);
            throw new Error("Invalid token response from server");
          }

          const expiresAt = Date.now() + (data.expires_in || 7200) * 1000;

          const newTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
            createdAt: Date.now(),
            codeVerifier: tokens.codeVerifier,
          };

          await setTokens(newTokens);

          console.log("Token refreshed successfully");

          lastSuccessfulRefreshTime = Date.now();

          return { success: true, newTokens };
        } catch (error) {
          console.error("Token refresh failed:", error);
          await forceLogout();
          return { success: false };
        } finally {
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    } catch (error) {
      console.error("Error initiating token refresh:", error);
      refreshPromise = null;
      await forceLogout();
      return { success: false };
    }
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
