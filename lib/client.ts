import ky, { type KyInstance } from "ky";

import { tokenManager } from "./tokenManager";

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
            const token = await tokenManager.getValidAccessToken();
            if (token) {
              request.headers.set("Authorization", `Bearer ${token}`);
            }
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.status === 401) {
              // Prevent multiple simultaneous refresh attempts
              if (refreshInProgress) {
                while (refreshInProgress) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
                const token = await tokenManager.getValidAccessToken();
                if (token) {
                  return clientInstance!.extend({
                    headers: { Authorization: `Bearer ${token}` },
                  })(request.url, {
                    method: request.method,
                    body: options.body,
                    headers: options.headers,
                  });
                }
                return response;
              }

              refreshInProgress = true;
              try {
                const refreshed = await tokenManager.refresh();

                if (refreshed?.accessToken) {
                  let retryBody: BodyInit | null = null;
                  if (request.body) {
                    if (options.body instanceof FormData) {
                      retryBody = options.body;
                    } else if (request.body instanceof FormData) {
                      retryBody = options.body || null;
                    } else {
                      try {
                        retryBody = await request.clone().body;
                      } catch {
                        retryBody = options.body || null;
                      }
                    }
                  }

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

                  return retryResponse;
                } else {
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

export default function useClient() {
  return getClient();
}
