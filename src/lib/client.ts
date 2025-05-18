import ky from "ky";
import { useContext, useMemo } from "react";

import AuthContext from "../auth";

export default function useClient() {
  const { tokens, setTokens, refreshAccessToken } = useContext(AuthContext);

  return useMemo(() => {
    // Keep track of requests that are currently being retried after a token refresh
    const pendingRetries = new Set();
    
    const client = ky.create({
      prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
      retry: {
        limit: 0, // Disable ky's built-in retry to use our custom logic
      },
      headers: {
        "User-Agent": "HCB-Mobile",
      },
      hooks: {
        beforeRequest: [
          async (request) => {
            // Check if we have a token and add it to the request
            if (tokens?.accessToken) {
              console.log(`Adding token to request: ${request.method} ${request.url}`);
              request.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
            }
          }
        ],
        afterResponse: [
          async (request, options, response) => {
            // If the request was successful, don't do anything
            if (response.ok) return response;
            
            // Check if this request is already being retried to prevent infinite loops
            const requestKey = `${request.method}:${request.url}`;
            if (pendingRetries.has(requestKey)) {
              console.log('Request already being retried, returning response as-is to avoid loop');
              pendingRetries.delete(requestKey);
              return response;
            }
            
            if (response.status === 401) {
              console.log('Received 401 response, attempting token refresh...');
              
              try {
                const result = await refreshAccessToken();
                
                if (result.success && result.newTokens) {

                  if (result.newTokens.accessToken !== tokens?.accessToken) {
                    console.log('Token refreshed, retrying request with new token');
                    
                    pendingRetries.add(requestKey);
                    
                    try {

                      const url = request.url.toString();
                      const apiBase = process.env.EXPO_PUBLIC_API_BASE;
                      let path = url.startsWith(apiBase) 
                        ? url.substring(apiBase.length)
                        : url;
                      
                      if (path.startsWith('/')) {
                        path = path.substring(1);
                      }
                      
                      console.log(`Retrying path: ${path}`);
                      
                      const latestAccessToken = result.newTokens.accessToken;
                      console.log(`Using directly returned token (first 10 chars): ${latestAccessToken.substring(0, 10)}...`);
                      
                      try {
                        const newResponse = await client(path, {
                          method: request.method,
                          headers: {
                            Authorization: `Bearer ${latestAccessToken}`
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
                    } catch (retryError) {
                      console.error(`Error retrying request: ${request.method} ${request.url}`, retryError);
                      pendingRetries.delete(requestKey);
                      return response; 
                    }
                  } else {
                    console.log('Skipping retry because token was too recently created and not refreshed');
                    return response;
                  }
                } else {
                  console.warn('Token refresh failed or no new token available - user will be logged out');
                  return response;
                }
              } catch (refreshError) {
                console.error('Error during token refresh - user will be logged out:', refreshError);
                return response;
              }
            }
            
            return response;
          }
        ]
      }
    });
    
    return client;
  }, [tokens, refreshAccessToken, setTokens]);
}