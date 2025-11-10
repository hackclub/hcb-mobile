import ky from "ky";
import { useContext, useEffect, useRef } from "react";

import AuthContext, { AuthTokens } from "../auth/auth";

type KyResponse = Awaited<ReturnType<typeof ky>>;

let globalRefreshInProgress = false;
let globalRefreshPromise: Promise<{
  success: boolean;
  newTokens?: AuthTokens;
}> | null = null;

interface QueuedRequest {
  resolve: (value: KyResponse) => void;
  reject: (reason?: Error) => void;
  retry: (token: string) => Promise<KyResponse>;
}

export default function useClient() {
  const { tokens, refreshAccessToken } = useContext(AuthContext);

  const tokensRef = useRef(tokens);
  const refreshAccessTokenRef = useRef(refreshAccessToken);
  const clientRef = useRef<ReturnType<typeof ky.create> | null>(null);
  const queuedRequestsRef = useRef<QueuedRequest[]>([]);
  const pendingRetriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  if (!clientRef.current) {
    const processQueuedRequests = async (freshToken: string) => {
      const requests = [...queuedRequestsRef.current];
      queuedRequestsRef.current = [];

      console.log(
        `Processing ${requests.length} queued requests after token refresh`,
      );

      await Promise.all(
        requests.map(async ({ resolve, reject, retry }) => {
          try {
            const response = await retry(freshToken);
            resolve(response);
          } catch (error) {
            console.error("Failed to process queued request", error, {
              context: "queue_processing",
            });
            reject(error);
          }
        }),
      );
    };

    const extractPath = (url: string): string => {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE || "";
      let path = url.startsWith(apiBase) ? url.substring(apiBase.length) : url;

      if (path.startsWith("/")) {
        path = path.substring(1);
      }

      return path;
    };

    clientRef.current = ky.create({
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
            const currentToken = tokensRef.current?.accessToken;
            if (currentToken) {
              request.headers.set("Authorization", `Bearer ${currentToken}`);
            }
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.ok) return response;

            const requestKey = `${request.method}:${request.url}`;

            if (pendingRetriesRef.current.has(requestKey)) {
              console.log(
                "Request already being retried, returning response as-is to avoid loop",
              );
              pendingRetriesRef.current.delete(requestKey);
              return response;
            }

            if (response.status === 401) {
              console.log("Received 401 response, attempting token refresh...");
              pendingRetriesRef.current.add(requestKey);

              try {
                // If refresh is already in progress, queue this request
                if (globalRefreshInProgress) {
                  console.log("Token refresh in progress, queueing request");

                  pendingRetriesRef.current.delete(requestKey);

                  return new Promise<KyResponse>((resolve, reject) => {
                    const path = extractPath(request.url.toString());
                    queuedRequestsRef.current.push({
                      resolve,
                      reject,
                      retry: async (freshToken: string) => {
                        return clientRef.current!(path, {
                          method: request.method,
                          headers: {
                            Authorization: `Bearer ${freshToken}`,
                          },
                          body: request.body,
                        });
                      },
                    });
                  });
                }

                if (globalRefreshInProgress && globalRefreshPromise) {
                  console.log(
                    "Another request started refresh, waiting for it...",
                  );
                  pendingRetriesRef.current.delete(requestKey);

                  return new Promise<KyResponse>((resolve, reject) => {
                    const path = extractPath(request.url.toString());
                    queuedRequestsRef.current.push({
                      resolve,
                      reject,
                      retry: async (freshToken: string) => {
                        return clientRef.current!(path, {
                          method: request.method,
                          headers: {
                            Authorization: `Bearer ${freshToken}`,
                          },
                          body: request.body,
                        });
                      },
                    });
                  });
                }

                globalRefreshInProgress = true;

                if (!globalRefreshPromise) {
                  globalRefreshPromise = refreshAccessTokenRef.current();
                }

                const result = await globalRefreshPromise;

                if (result.success && result.newTokens) {
                  console.log(
                    "Token refresh successful, processing queued requests",
                  );

                  const newToken = result.newTokens.accessToken;

                  // Only process queue if we have requests
                  if (queuedRequestsRef.current.length > 0) {
                    await processQueuedRequests(newToken);
                  }

                  const path = extractPath(request.url.toString());

                  console.log(`Retrying original request: ${path}`);

                  try {
                    const newResponse = await clientRef.current!(path, {
                      method: request.method,
                      headers: {
                        Authorization: `Bearer ${newToken}`,
                      },
                      body: request.body,
                    });

                    console.log(
                      `Retry succeeded with status: ${newResponse.status}`,
                    );
                    pendingRetriesRef.current.delete(requestKey);
                    return newResponse;
                  } catch (innerError) {
                    pendingRetriesRef.current.delete(requestKey);
                    throw innerError;
                  }
                } else {
                  console.error("Token refresh failed, returning 401 response");
                  pendingRetriesRef.current.delete(requestKey);
                  return response;
                }
              } catch (refreshError) {
                pendingRetriesRef.current.delete(requestKey);

                const requests = [...queuedRequestsRef.current];
                queuedRequestsRef.current = [];
                requests.forEach(({ reject }) => {
                  reject(new Error("Token refresh failed"));
                });

                return response;
              } finally {
                globalRefreshInProgress = false;
                globalRefreshPromise = null;
              }
            }

            return response;
          },
        ],
      },
    });
  }

  return clientRef.current;
}
