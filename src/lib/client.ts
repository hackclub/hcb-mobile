import ky from "ky";
import { useContext, useEffect, useRef } from "react";

import AuthContext from "../auth/auth";

type KyResponse = Awaited<ReturnType<typeof ky>>;

interface QueuedRequest {
  resolve: (value: KyResponse) => void;
  reject: (reason?: Error) => void;
  retry: (token: string) => Promise<KyResponse>;
}

export default function useClient() {
  const { tokenResponse, refreshAccessToken, setTokenResponse } =
    useContext(AuthContext);

  const tokenResponseRef = useRef(tokenResponse);
  const refreshAccessTokenRef = useRef(refreshAccessToken);
  const setTokenResponseRef = useRef(setTokenResponse);
  const clientRef = useRef<ReturnType<typeof ky.create> | null>(null);
  const queuedRequestsRef = useRef<QueuedRequest[]>([]);
  const pendingRetriesRef = useRef<Set<string>>(new Set());
  const freshTokenMapRef = useRef<Map<string, string>>(new Map());
  const refreshInProgressRef = useRef(false);

  useEffect(() => {
    tokenResponseRef.current = tokenResponse;
  }, [tokenResponse]);

  useEffect(() => {
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    setTokenResponseRef.current = setTokenResponse;
  }, [setTokenResponse]);

  if (!clientRef.current) {
    const extractPath = (url: string): string => {
      const apiBase = process.env.EXPO_PUBLIC_API_BASE || "";
      let path = url.startsWith(apiBase) ? url.substring(apiBase.length) : url;
      if (path.startsWith("/")) {
        path = path.substring(1);
      }
      return path;
    };

    const createRequestKey = (method: string, url: string): string => {
      return `${method}:${url}`;
    };

    const createUniqueRetryKey = (method: string, path: string): string => {
      const fullUrl = `${process.env.EXPO_PUBLIC_API_BASE}/${path}`;
      const uniqueId = `${Date.now()}-${Math.random()}`;
      return `${method}:${fullUrl}:${uniqueId}`;
    };

    const executeWithFreshToken = async (
      path: string,
      method: string,
      body: BodyInit | null | undefined,
      freshToken: string,
    ): Promise<KyResponse> => {
      const retryKey = createUniqueRetryKey(method, path);
      freshTokenMapRef.current.set(retryKey, freshToken);

      return clientRef.current!(path, { method, body });
    };

    const queueRequestForRetry = (
      request: Request,
      resolve: (value: KyResponse) => void,
      reject: (reason?: Error) => void,
    ): void => {
      const path = extractPath(request.url.toString());
      const method = request.method;

      queuedRequestsRef.current.push({
        resolve,
        reject,
        retry: async (freshToken: string) => {
          return executeWithFreshToken(path, method, request.body, freshToken);
        },
      });
    };

    const processQueuedRequests = async (freshToken: string) => {
      const requests = [...queuedRequestsRef.current];
      queuedRequestsRef.current = [];

      console.log(
        `Processing ${requests.length} queued requests after token refresh`,
      );

      pendingRetriesRef.current.clear();
      freshTokenMapRef.current.clear();

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

    const handleTokenRefreshSuccess = async (
      request: Request,
      requestKey: string,
      newToken: string,
    ): Promise<KyResponse> => {
      console.log("Token refresh successful, processing queued requests");

      if (queuedRequestsRef.current.length > 0) {
        await processQueuedRequests(newToken);
      }

      const path = extractPath(request.url.toString());
      console.log(`Retrying original request: ${path}`);

      pendingRetriesRef.current.delete(requestKey);

      const response = await executeWithFreshToken(
        path,
        request.method,
        request.body,
        newToken,
      );

      console.log(`Retry succeeded with status: ${response.status}`);
      return response;
    };

    const handleTokenRefreshFailure = async (
      requestKey: string,
      originalResponse: Response,
    ): Promise<Response> => {
      console.error("Token refresh process failed - forcing logout");
      pendingRetriesRef.current.delete(requestKey);

      const requests = [...queuedRequestsRef.current];
      queuedRequestsRef.current = [];
      requests.forEach(({ reject }) => {
        reject(new Error("Token refresh failed"));
      });

      await setTokenResponseRef.current(null);

      return originalResponse;
    };

    const handle401Response = async (
      request: Request,
      requestKey: string,
      response: Response,
    ): Promise<KyResponse | Response> => {
      try {
        if (refreshInProgressRef.current) {
          return new Promise<KyResponse>((resolve, reject) => {
            queueRequestForRetry(request, resolve, reject);
          });
        }

        refreshInProgressRef.current = true;
        pendingRetriesRef.current.add(requestKey);
        const result = await refreshAccessTokenRef.current();

        if (result.success && result.newTokenResponse) {
          tokenResponseRef.current = result.newTokenResponse;
          const successResponse = await handleTokenRefreshSuccess(
            request,
            requestKey,
            result.newTokenResponse.accessToken,
          );
          refreshInProgressRef.current = false;
          return successResponse;
        } else {
          console.warn("Token refresh did not succeed - forcing logout");
          pendingRetriesRef.current.delete(requestKey);
          refreshInProgressRef.current = false;
          await setTokenResponseRef.current(null);
          return response;
        }
      } catch (error) {
        console.error("Error during token refresh:", error);
        refreshInProgressRef.current = false;
        return await handleTokenRefreshFailure(requestKey, response);
      }
    };

    clientRef.current = ky.create({
      prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
      retry: {
        limit: 3,
        methods: ["get", "put", "head", "delete", "options", "trace", "post"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        backoffLimit: 10000,
      },
      headers: {
        "User-Agent": "HCB-Mobile",
      },
      timeout: 30000,
      hooks: {
        beforeRequest: [
          async (request) => {
            const requestKey = createRequestKey(request.method, request.url);

            for (const [key, token] of freshTokenMapRef.current.entries()) {
              if (key.startsWith(requestKey)) {
                request.headers.set("Authorization", `Bearer ${token}`);
                freshTokenMapRef.current.delete(key);
                return;
              }
            }

            const currentToken = tokenResponseRef.current?.accessToken;
            if (currentToken) {
              request.headers.set("Authorization", `Bearer ${currentToken}`);
            }
          },
        ],
        beforeRetry: [
          async ({ request, error, retryCount }) => {
            console.log(
              `Retrying request (attempt ${retryCount + 1}):`,
              request.url,
              error instanceof Error ? error.message : "Unknown error",
            );
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.ok) return response;

            const requestKey = createRequestKey(request.method, request.url);

            if (pendingRetriesRef.current.has(requestKey)) {
              console.log(
                "Request already being retried, returning response as-is to avoid loop",
              );
              pendingRetriesRef.current.delete(requestKey);
              return response;
            }

            // Handle 401 unauthorized responses
            if (response.status === 401) {
              return handle401Response(request, requestKey, response);
            }

            return response;
          },
        ],
      },
    });
  }

  return clientRef.current;
}
