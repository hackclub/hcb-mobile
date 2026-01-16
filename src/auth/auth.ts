import { TokenResponse } from "expo-auth-session";
import { createContext } from "react";

const AuthContext = createContext<{
  tokenResponse: TokenResponse | null;
  codeVerifier?: string;
  setTokenResponse: (tokenResponse: TokenResponse | null, codeVerifier?: string) => void;
  refreshAccessToken: () => Promise<{
    success: boolean;
    newTokenResponse?: TokenResponse;
  }>;
  shouldRefreshToken: (leewaySeconds?: number) => boolean;
}>({
  tokenResponse: null,
  codeVerifier: undefined,
  setTokenResponse: () => {},
  refreshAccessToken: async () => ({ success: false }),
  shouldRefreshToken: () => false,
});

export default AuthContext;
