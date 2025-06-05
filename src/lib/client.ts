import ky from "ky";
import { useContext, useMemo } from "react";

import AuthContext, { AuthTokens } from "../auth";

const RETRY_DELAY = 1000;

export default function useClient() {
  const { tokens, refreshAccessToken } = useContext(AuthContext);

  return useMemo(() => {
    const pendingRetries = new Set();
    let refreshPromise: Promise<{ success: boolean; newTokens?: AuthTokens }> | null = null;

    const client = ky.create({
      prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
      retry: {
        limit: 0,
      },
      headers: {
        "User-Agent": "HCB-Mobile",
      },
      timeout: 30000,
      hooks: {
        beforeRequest: [
          async (request) => {
            if (tokens?.accessToken) {
              request.headers.set(
                "Authorization",
                `Bearer ${tokens.accessToken}`,
              );
            }
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.ok) return response;

            const requestKey = `${request.method}:${request.url}`;

            if (response.status !== 401) {
              return response;
            }

            if (pendingRetries.has(requestKey)) {
              console.log(
                "Request already being retried, returning response as-is to avoid loop",
              );
              pendingRetries.delete(requestKey);
              return response;
            }

            console.log("Received 401 response, attempting token refresh...");

            try {
              const refreshResult = refreshPromise || (refreshPromise = refreshAccessToken());
              const result = await refreshResult;
              refreshPromise = null;

              if (!result.success || !result.newTokens) {
                console.warn("Token refresh failed - user will be logged out");
                return response;
              }

              if (result.newTokens.accessToken !== tokens?.accessToken) {
                console.log("Token refreshed, retrying request with new token");
                pendingRetries.add(requestKey);

                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

                try {
                  const url = request.url.toString();
                  const apiBase = process.env.EXPO_PUBLIC_API_BASE;
                  let path = url.startsWith(apiBase)
                    ? url.substring(apiBase.length)
                    : url;

                  if (path.startsWith("/")) {
                    path = path.substring(1);
                  }

                  console.log(`Retrying path: ${path}`);

                  const latestAccessToken = result.newTokens.accessToken;
                  console.log(
                    `Using directly returned token (first 10 chars): ${latestAccessToken.substring(0, 10)}...`,
                  );

                  const newResponse = await client(path, {
                    method: request.method,
                    headers: {
                      Authorization: `Bearer ${latestAccessToken}`,
                    },
                    body: request.body,
                  });

                  console.log(`Retry succeeded with status: ${newResponse.status}`);
                  pendingRetries.delete(requestKey);
                  return newResponse;
                } catch (innerError) {
                  console.error(`Inner retry request failed: ${innerError.message}`);
                  pendingRetries.delete(requestKey);
                  return response;
                }
              } else {
                console.log("Token was not refreshed, skipping retry");
                return response;
              }
            } catch (refreshError) {
              console.error("Error during token refresh:", refreshError);
              refreshPromise = null;
              return response;
            } finally {
              pendingRetries.delete(requestKey);
            }
          },
        ],
      },
    });

    return client;
  }, [tokens, refreshAccessToken]);
}
