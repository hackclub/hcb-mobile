import ky, { type KyInstance } from "ky";

import { tokenManager } from "./tokenManager";

/**
 * Simplified HTTP client with automatic token refresh
 * Token refresh is handled automatically before requests and on 401 responses
 */
let clientInstance: KyInstance | null = null;
let refreshInProgress = false;

export function getClient(): KyInstance {
  if (!clientInstance) {
    clientInstance = ky.create({
      prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
      retry: {
        limit: 3,
        methods: ["get", "put", "head", "delete", "options", "trace", "post"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: {
        "User-Agent": "HCB-Mobile",
      },
      timeout: 30000,
      hooks: {
        beforeRequest: [
          async (request) => {
            // Get valid access token (refreshes automatically if needed)
            const token = await tokenManager.getValidAccessToken();
            if (token) {
              request.headers.set("Authorization", `Bearer ${token}`);
            } else {
              console.warn(
                "[HTTP Client] No access token available for request",
                {
                  url: request.url,
                  method: request.method,
                },
              );
            }
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            // Handle 401 by refreshing token and retrying once
            if (response.status === 401) {
              console.warn("[HTTP Client] Received 401 Unauthorized", {
                url: request.url,
                method: request.method,
              });

              // Prevent multiple simultaneous refresh attempts
              if (refreshInProgress) {
                console.log(
                  "[HTTP Client] Refresh already in progress, waiting...",
                );
                // Wait for ongoing refresh to complete
                while (refreshInProgress) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
                // Retry with fresh token
                const token = await tokenManager.getValidAccessToken();
                if (token) {
                  console.log(
                    "[HTTP Client] Retrying request after refresh completed",
                  );
                  return clientInstance!.extend({
                    headers: { Authorization: `Bearer ${token}` },
                  })(request.url, {
                    method: request.method,
                    body: options.body,
                    headers: options.headers,
                  });
                }
                console.warn(
                  "[HTTP Client] No token available after refresh, returning 401",
                );
                return response;
              }

              refreshInProgress = true;
              try {
                console.log(
                  "[HTTP Client] Starting token refresh due to 401...",
                );
                const refreshed = await tokenManager.refresh();

                if (refreshed?.accessToken) {
                  console.log(
                    "[HTTP Client] Token refreshed, retrying original request",
                  );
                  // Clone request body if it exists (FormData, Blob, etc. can't be reused)
                  let retryBody: BodyInit | null = null;
                  if (request.body) {
                    // For FormData, we need to reconstruct it from options
                    if (options.body instanceof FormData) {
                      retryBody = options.body;
                    } else if (request.body instanceof FormData) {
                      // FormData can't be cloned, use from options if available
                      retryBody = options.body || null;
                    } else {
                      // For other body types, try to clone
                      try {
                        retryBody = await request.clone().body;
                      } catch {
                        // Fallback to options.body
                        retryBody = options.body || null;
                      }
                    }
                  }

                  // Retry using ky to maintain consistency
                  const retryClient = clientInstance!.extend({
                    headers: {
                      Authorization: `Bearer ${refreshed.accessToken}`,
                    },
                  });

                  type HttpMethod =
                    | "GET"
                    | "POST"
                    | "PUT"
                    | "DELETE"
                    | "PATCH"
                    | "HEAD"
                    | "OPTIONS";
                  const retryResponse = await retryClient(request.url, {
                    method: request.method as HttpMethod,
                    body: retryBody || options.body,
                    headers: options.headers,
                  });

                  console.log("[HTTP Client] Retry successful", {
                    status: retryResponse.status,
                    url: request.url,
                  });
                  return retryResponse;
                } else {
                  // Refresh failed, logout
                  console.error(
                    "[HTTP Client] Token refresh failed, logging out",
                  );
                  await tokenManager.logout("401_refresh_failed");
                  return response;
                }
              } finally {
                refreshInProgress = false;
              }
            }

            return response;
          },
        ],
      },
    });
  }
  return clientInstance;
}

/**
 * Hook to get the HTTP client instance
 * Token refresh is handled automatically
 */
export default function useClient() {
  return getClient();
}
