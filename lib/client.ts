import Constants from "expo-constants";
import ky, { type KyInstance } from "ky";
import { Platform } from "react-native";

import { recordApiFailure } from "./sentry/apiTelemetry";
import { tokenManager, UnauthenticatedError } from "./tokenManager";

let clientInstance: KyInstance | null = null;

const userAgent = `HCB-Mobile/${Constants.expoConfig?.version ?? "unknown"} (${Platform.OS})`;

// Expo SDK 56's winter fetch doesn't support RN's { uri, name, type } FormData file parts.
// For FormData requests we use XHR directly (which goes through RN's native networking layer)
// and wrap the result in a Response so ky can process it normally.
// We capture the original FormData in beforeRequest because ky wraps it in new Request()
// before calling our custom fetch, making it inaccessible via standard APIs.
const formDataBodies = new WeakMap<Request, FormData>();

function xhrFetch(
  url: string,
  method: string,
  headers: Headers,
  body: FormData,
  signal?: AbortSignal | null,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }
    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr
        .getAllResponseHeaders()
        .trim()
        .split("\n")
        .forEach((line) => {
          const idx = line.indexOf(":");
          if (idx > 0) {
            responseHeaders.set(
              line.slice(0, idx).trim(),
              line.slice(idx + 1).trim(),
            );
          }
        });
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        }),
      );
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
        "User-Agent": userAgent,
      },
      timeout: 30000,
      fetch: (input, init) => {
        if (input instanceof Request) {
          const formData = formDataBodies.get(input);
          formDataBodies.delete(input);
          if (formData) {
            return xhrFetch(
              input.url,
              input.method,
              input.headers,
              formData,
              init?.signal ?? input.signal,
            );
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
            // Every v4 endpoint requires auth, so a request with no token is a
            // guaranteed 401. Failing here keeps a single dead session from
            // fanning out into dozens of 401s, SWR errors and retries.
            if (!token) {
              throw new UnauthenticatedError();
            }
            request.headers.set("Authorization", `Bearer ${token}`);
          },
        ],
        beforeError: [
          (error) => {
            recordApiFailure(error);
            return error;
          },
        ],
        beforeRetry: [
          ({ error }) => {
            // ky retries anything thrown from beforeRequest. Rethrowing ends the
            // chain: with no session every attempt fails identically, and each
            // one would kick off another refresh — enough to burn through
            // TokenManager's consecutive-failure budget during a short outage.
            if (error instanceof UnauthenticatedError) {
              throw error;
            }
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.status !== 401) {
              return response;
            }

            // If this request is itself a post-refresh retry that still 401'd,
            // a fresh token didn't help — don't refresh/retry again, or we'd
            // loop forever refreshing a token the server keeps rejecting.
            if (request.headers.get("x-hcb-token-retry") === "1") {
              return response;
            }

            // tokenManager.refresh() dedupes concurrent callers via a shared
            // promise, so a burst of parallel 401s triggers a single network
            // refresh. It also owns the decision of whether a failure is
            // terminal (ends the session) or transient (keeps the session) —
            // we never log out here.
            const refreshed = await tokenManager.refresh();

            if (!refreshed?.accessToken) {
              // Refresh didn't yield a token. If this was transient, the
              // session is still alive and SWR will retry the request; if it
              // was terminal, tokenManager has already logged out. Either way,
              // surface the 401 and let the retry layer decide.
              return response;
            }

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
                "x-hcb-token-retry": "1",
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
            return retryClient(request.url, {
              method: request.method as HttpMethod,
              body: retryBody || options.body,
              headers: options.headers,
            });
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
