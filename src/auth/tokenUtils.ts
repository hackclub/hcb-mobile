import { TokenResponse } from "expo-auth-session";

export interface LegacyAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  codeVerifier?: string;
}

export function tokenResponseToLegacyTokens(
  tokenResponse: TokenResponse | null,
  codeVerifier?: string,
): LegacyAuthTokens | null {
  if (!tokenResponse) {
    return null;
  }

  const issuedAt = tokenResponse.issuedAt
    ? tokenResponse.issuedAt * 1000
    : Date.now();
  const expiresIn = tokenResponse.expiresIn || 7200;
  const expiresAt = issuedAt + expiresIn * 1000;

  return {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken || "",
    expiresAt,
    createdAt: issuedAt,
    codeVerifier,
  };
}


export function getAccessToken(
  tokenResponse: TokenResponse | null,
): string | null {
  return tokenResponse?.accessToken || null;
}
