export interface NetworkLog {
  id: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
}

type Listener = (logs: NetworkLog[]) => void;

const MAX_LOGS = 100;

class NetworkLogger {
  private logs: NetworkLog[] = [];
  private listeners: Set<Listener> = new Set();

  addLog(log: NetworkLog) {
    this.logs.unshift(log);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.notifyListeners();
  }

  updateLog(id: string, updates: Partial<NetworkLog>) {
    const index = this.logs.findIndex((log) => log.id === id);
    if (index !== -1) {
      this.logs[index] = { ...this.logs[index], ...updates };
      this.notifyListeners();
    }
  }

  getLogs(): NetworkLog[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.logs));
  }
}

export const networkLogger = new NetworkLogger();

let requestIdCounter = 0;

const originalFetch = global.fetch;

global.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const id = `req_${++requestIdCounter}_${Date.now()}`;
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || (typeof input === "object" && "method" in input ? input.method : "GET") || "GET";

  const requestHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    } else {
      Object.assign(requestHeaders, init.headers);
    }
  }

  let requestBody: string | undefined;
  if (init?.body) {
    if (typeof init.body === "string") {
      requestBody = init.body;
    } else if (init.body instanceof FormData) {
      requestBody = "[FormData]";
    } else {
      requestBody = "[Binary Data]";
    }
  }

  const startTime = Date.now();

  networkLogger.addLog({
    id,
    url,
    method,
    requestHeaders,
    requestBody,
    startTime,
  });

  try {
    const response = await originalFetch(input, init);
    const endTime = Date.now();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const clonedResponse = response.clone();
    let responseBody: string | undefined;
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("text/")) {
        responseBody = await clonedResponse.text();
        if (responseBody.length > 10000) {
          responseBody = responseBody.substring(0, 10000) + "... [truncated]";
        }
      } else {
        responseBody = `[${contentType || "Binary Data"}]`;
      }
    } catch {
      responseBody = "[Unable to read body]";
    }

    networkLogger.updateLog(id, {
      status: response.status,
      statusText: response.statusText,
      responseHeaders,
      responseBody,
      endTime,
      duration: endTime - startTime,
    });

    return response;
  } catch (error) {
    const endTime = Date.now();
    networkLogger.updateLog(id, {
      error: error instanceof Error ? error.message : "Unknown error",
      endTime,
      duration: endTime - startTime,
    });
    throw error;
  }
};
