import ky, { type KyInstance } from "ky";

import { tokenManager } from "./tokenManager";

let clientInstance: KyInstance | null = null;
let refreshInProgress = false;

// Expo SDK 56's winter fetch doesn't support RN's { uri, name, type } FormData file parts.
// For FormData requests we use XHR directly (which goes through RN's native networking layer)
// and wrap the result in a Response so ky can process it normally.
// We capture the original FormData in beforeRequest because ky wraps it in new Request()
// before calling our custom fetch, making it inaccessible via standard APIs.
const formDataBodies = new WeakMap<Request, FormData>();

function xhrFetch(url: string, method: string, headers: Headers, body: FormData, signal?: AbortSignal | null): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }
    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split("\n").forEach((line) => {
        const idx = line.indexOf(":");
        if (idx > 0) {
          responseHeaders.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
        }
      });
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      }));
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send(body);
  });
}

export function getClient(): KyInstance {
  if (!clientInstance) {
    clientInstance = ky.create({
      prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
      retry: {
        limit: 3,
        methods: ["get", "head", "options", "trace"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: {
        "User-Agent": "HCB-Mobile",
      },
      timeout: 30000,
      fetch: (input, init) => {
        if (input instanceof Request) {
          const formData = formDataBodies.get(input);
          formDataBodies.delete(input);
          if (formData) {
            return xhrFetch(input.url, input.method, input.headers, formData, init?.signal ?? input.signal);
          }
        }
        return globalThis.fetch(input, init);
      },
      hooks: {
        beforeRequest: [
          async (request, options) => {
            if (options.body instanceof FormData) {
              formDataBodies.set(request, options.body as FormData);
            }
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
