import { TokenResponse } from "expo-auth-session";
import React, { useState, useEffect } from "react";

import { tokenManager } from "../lib/tokenManager";

import AuthContext from "./auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    };
    loadTokens();
  }, []);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      const currentToken = tokenManager.getToken();
      if (currentToken !== tokenResponse) {
        setTokenResponseState(currentToken);
        setCodeVerifierState(tokenManager.getCodeVerifier());
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [tokenResponse]);

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
