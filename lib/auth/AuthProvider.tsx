import { TokenResponse } from "expo-auth-session";
import React, { useState, useEffect } from "react";

import { tokenManager } from "../tokenManager";

import AuthContext from "./auth";

export function AuthProvider({
  children,
  onAuthReady,
}: {
  children: React.ReactNode;
  onAuthReady?: () => void;
}) {
  const [tokenResponse, setTokenResponseState] = useState<TokenResponse | null>(
    null,
  );
  const [codeVerifier, setCodeVerifierState] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTokens = async () => {
      await tokenManager.load();
      setTokenResponseState(tokenManager.getToken());
      setCodeVerifierState(tokenManager.getCodeVerifier());
      setIsLoading(false);
      onAuthReady?.();
    };
    loadTokens();
  }, [onAuthReady]);

  // TokenManager owns the session and can change it without a caller — a
  // rotated token after a background refresh, or a forced logout when the
  // refresh token is rejected. Subscribing propagates that immediately;
  // polling left the app fetching with a dead session until the next tick.
  useEffect(() => {
    return tokenManager.subscribe((currentToken) => {
      setTokenResponseState(currentToken);
      setCodeVerifierState(tokenManager.getCodeVerifier());
    });
  }, []);

  const setTokenResponse = async (
    newTokenResponse: TokenResponse | null,
    newCodeVerifier?: string,
  ) => {
    if (newTokenResponse) {
      await tokenManager.save(newTokenResponse, newCodeVerifier);
      setTokenResponseState(newTokenResponse);
      if (newCodeVerifier) {
        setCodeVerifierState(newCodeVerifier);
      }
    } else {
      await tokenManager.logout();
      setTokenResponseState(null);
      setCodeVerifierState(undefined);
    }
  };

  const refreshAccessToken = async (): Promise<{
    success: boolean;
    newTokenResponse?: TokenResponse;
  }> => {
    const refreshed = await tokenManager.refresh();
    if (refreshed) {
      setTokenResponseState(refreshed);
      return { success: true, newTokenResponse: refreshed };
    }
    setTokenResponseState(null);
    return { success: false };
  };

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
        shouldRefreshToken: () => {
          if (!tokenResponse) return false;
          return tokenResponse.shouldRefresh() || false;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
