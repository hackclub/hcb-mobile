import * as Sentry from "@sentry/react-native";

import log from "../log";

import {
  describeApiError,
  isActionableApiError,
  statusClassOf,
  type ApiErrorInfo,
} from "./apiErrors";
import { setLastRequestContext } from "./context";

function outcomeOf(info: ApiErrorInfo): string {
  switch (info.kind) {
    case "timeout":
      return "timed out";
    case "network":
      return "no network";
    case "aborted":
      return "aborted";
    default:
      return info.status === null ? "failed" : String(info.status);
  }
}

export function recordApiFailure(error: unknown): void {
  const info = describeApiError(error);
  if (!info) return;

  if (info.kind === "aborted") return;

  const statusClass = statusClassOf(info.status);

  Sentry.addBreadcrumb({
    category: "api",
    type: "http",
    level: isActionableApiError(info) ? "error" : "warning",
    message: `${info.method} ${info.route} → ${outcomeOf(info)}`,
    data: {
      method: info.method,
      route: info.route,
      status: info.status,
      kind: info.kind,
    },
  });

  if (info.url) {
    setLastRequestContext({
      method: info.method,
      url: info.url,
      route: info.route,
      status: info.status,
    });
  }

  if (isActionableApiError(info)) return;

  log.warn(`API ${info.method} ${info.route} → ${outcomeOf(info)}`, {
    "api.kind": info.kind,
    "api.method": info.method,
    "api.route": info.route,
    "api.status": info.status ?? undefined,
    "api.status_class": statusClass,
  });
}
