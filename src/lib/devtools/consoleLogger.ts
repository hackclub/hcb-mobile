export interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
}

type Listener = (logs: ConsoleLog[]) => void;

const MAX_LOGS = 200;

class ConsoleLogger {
  private logs: ConsoleLog[] = [];
  private listeners: Set<Listener> = new Set();

  addLog(type: ConsoleLog["type"], args: unknown[]) {
    const message = args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

    const log: ConsoleLog = {
      id: `console_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: message.length > 5000 ? message.substring(0, 5000) + "..." : message,
      timestamp: Date.now(),
    };

    this.logs.unshift(log);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.notifyListeners();
  }

  getLogs(): ConsoleLog[] {
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

export const consoleLogger = new ConsoleLogger();

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

console.log = (...args: unknown[]) => {
  consoleLogger.addLog("log", args);
  originalConsole.log(...args);
};

console.warn = (...args: unknown[]) => {
  consoleLogger.addLog("warn", args);
  originalConsole.warn(...args);
};

console.error = (...args: unknown[]) => {
  consoleLogger.addLog("error", args);
  originalConsole.error(...args);
};

console.info = (...args: unknown[]) => {
  consoleLogger.addLog("info", args);
  originalConsole.info(...args);
};
