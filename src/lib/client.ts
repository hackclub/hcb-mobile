import ky from "ky";
import { useContext, useMemo } from "react";

import AuthContext, { AuthTokens } from "../auth/auth";

type KyResponse = Awaited<ReturnType<typeof ky>>;

export default function useClient() {
  const { tokens, refreshAccessToken } = useContext(AuthContext);

  return useMemo(() => {
    const pendingRetries = new Set();
    let refreshInProgress = false;
    let refreshPromise: Promise<{
      success: boolean;
      newTokens?: AuthTokens;
    }> | null = null;
    let queuedRequests: Array<() => Promise<KyResponse>> = [];

    const processQueuedRequests = async () => {
      const requests = [...queuedRequests];
      queuedRequests = [];
      return Promise.all(
        requests.map(async (retry) => {
          try {
            return await retry();
          } catch (error) {
            console.error("Failed to process queued request", error, {
              context: "queue_processing",
            });
            throw error;
          }
        }),
      );
    };

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
            if (refreshInProgress) {
              // If refresh is in progress, queue this request
              return new Promise<KyResponse>(() => {
                queuedRequests.push(async () => {
                  try {
                    const url = request.url.toString();
                    const apiBase = process.env.EXPO_PUBLIC_API_BASE;
                    let path = url.startsWith(apiBase)
                      ? url.substring(apiBase.length)
                      : url;

                    if (path.startsWith("/")) {
                      path = path.substring(1);
                    }

                    const newResponse = await client(path, {
                      method: request.method,
                      headers: {
                        Authorization: `Bearer ${tokens?.accessToken}`,
                      },
                      body: request.body,
                    });
                    return newResponse;
                  } catch (error) {
                    console.error("Failed to process queued request", error, {
                      context: "auth_retry",
                    });
                    throw error;
                  }
                });
              });
            }

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
            if (pendingRetries.has(requestKey)) {
              console.log(
                "Request already being retried, returning response as-is to avoid loop",
              );
              pendingRetries.delete(requestKey);
              return response;
            }

            if (response.status === 401) {
              console.log("Received 401 response, attempting token refresh...");

              if (refreshInProgress && refreshPromise) {
                // Wait for the ongoing refresh, then retry this request
                console.log(
                  "Refresh already in progress, waiting for it to complete...",
                );
                try {
                  const result = await refreshPromise;

                  if (result.success && result.newTokens) {
                    const url = request.url.toString();
                    const apiBase = process.env.EXPO_PUBLIC_API_BASE;
                    let path = url.startsWith(apiBase)
                      ? url.substring(apiBase.length)
                      : url;

                    if (path.startsWith("/")) {
                      path = path.substring(1);
                    }

                    console.log(
                      `Retrying request after waiting for refresh: ${path}`,
                    );
                    const newResponse = await client(path, {
                      method: request.method,
                      headers: {
                        Authorization: `Bearer ${result.newTokens.accessToken}`,
                      },
                      body: request.body,
                    });
                    return newResponse;
                  }
                } catch (error) {
                  console.error("Failed to retry after refresh", error, {
                    context: "wait_for_refresh_retry",
                  });
                  return response;
                }
              }

              refreshInProgress = true;
              try {
                if (!refreshPromise) {
                  refreshPromise = refreshAccessToken();
                }
                const result = await refreshPromise;

                if (result.success && result.newTokens) {
                  if (result.newTokens.accessToken !== tokens?.accessToken) {
                    console.log(
                      "Token refreshed, processing all queued requests",
                    );

                    await processQueuedRequests();

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

                    try {
                      const newResponse = await client(path, {
                        method: request.method,
                        headers: {
                          Authorization: `Bearer ${latestAccessToken}`,
                        },
                        body: request.body,
                      });

                      console.log(
                        `Retry succeeded with status: ${newResponse.status}`,
                      );
                      pendingRetries.delete(requestKey);
                      return newResponse;
                    } catch (innerError) {
                      console.error("Inner retry request failed", innerError, {
                        context: "inner_retry",
                      });
                      pendingRetries.delete(requestKey);
                      return response;
                    }
                  }
                }
              } catch (refreshError) {
                console.error(
                  "Error during token refresh - user will be logged out",
                  refreshError,
                  { context: "token_refresh" },
                );
              } finally {
                refreshInProgress = false;
                refreshPromise = null;
              }
            }

            return response;
          },
        ],
      },
    });

    return client;
  }, [tokens, refreshAccessToken]);
}
