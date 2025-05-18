import { createContext } from "react";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  codeVerifier?: string;
}

const AuthContext = createContext<{
  tokens: AuthTokens | null;
  setTokens: (tokens: AuthTokens | null) => void;
  refreshAccessToken: () => Promise<{
    success: boolean;
    newTokens?: AuthTokens;
  }>;
}>({
  tokens: null,
  setTokens: () => {},
  refreshAccessToken: async () => ({ success: false }),
});

export default AuthContext;
