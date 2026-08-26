import * as Sentry from "@sentry/react-native";

import {
  describeApiError,
  isActionableApiError,
  statusClassOf,
} from "./apiErrors";
import { featureForRoute, isCriticalFeature, setBuildContext } from "./context";
import { IGNORED_ERRORS, isNoisyBreadcrumb, isNoisyLog } from "./noise";
import { redactDeep, redactString, redactUrl } from "./redact";

import type { ErrorEvent, Event } from "@sentry/react-native";

export const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

const SEND_FROM_DEV_BUILDS = process.env.EXPO_PUBLIC_SENTRY_DEBUG === "1";

export const SEND_USER_PII = false;

const GENERIC_EXCEPTION_TITLE =
  /^(?:withScope|anonymous|<global>|consoleHandler|console\.(?:error|warn)|Error|apply|call|<unknown>|\?anon_\d+_)$/;

function messageSignature(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, "{url}")
    .replace(/\b[a-z]{2,6}_[A-Za-z0-9]{4,}\b/g, "{id}")
    .replace(/\b[0-9a-f]{8,}\b/gi, "{hash}")
    .replace(/\b\d+\b/g, "{n}")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function firstMessageOf(event: Event): string {
  if (typeof event.message === "string") return event.message;
  const exception = event.exception?.values?.[0];
  return exception?.value ?? "";
}

function processApiError(
  event: ErrorEvent,
  original: unknown,
): ErrorEvent | null {
  const info = describeApiError(original);
  if (!info) return event;

  if (!isActionableApiError(info)) return null;

  const statusClass = statusClassOf(info.status);

  event.fingerprint = ["api-error", info.method, info.route, statusClass];
  event.tags = {
    ...event.tags,
    "api.method": info.method,
    "api.route": info.route,
    "api.status": info.status === null ? "unknown" : String(info.status),
    "api.status_class": statusClass,
  };

  const exception = event.exception?.values?.[0];
  if (exception) {
    exception.value = `HTTP ${info.status ?? "?"} ${info.method} ${info.route}`;
  }

  return event;
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (typeof event.message === "string") {
    event.message = redactString(event.message);
  }

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactString(exception.value);
  }

  if (event.extra) {
    event.extra = redactDeep(event.extra);
  }

  if (event.request) {
    if (event.request.url) event.request.url = redactUrl(event.request.url);
    if (event.request.headers) {
      event.request.headers = redactDeep(event.request.headers);
    }
    if (event.request.data) event.request.data = redactDeep(event.request.data);
  }

  for (const key of ["api_request", "organization", "build"] as const) {
    const context = event.contexts?.[key];
    if (context) event.contexts![key] = redactDeep(context);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? redactString(crumb.message) : crumb.message,
      data: crumb.data ? redactDeep(crumb.data) : crumb.data,
    }));
  }

  if (!SEND_USER_PII && event.user) {
    event.user = {
      id: event.user.id,
      ip_address: null,
    };
  }

  return event;
}

export function initSentry(): void {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: !__DEV__ || SEND_FROM_DEV_BUILDS,
    debug: false,
    environment: __DEV__ ? "development" : undefined,

    enableLogs: true,

    sendDefaultPii: SEND_USER_PII,
    attachScreenshot: false,
    attachStacktrace: true,

    tracesSampler: ({ name, attributes, inheritOrSampleWith }) => {
      const op = attributes?.["sentry.op"];

      if (op === "ui.load" || name === "App Start") return 0.1;

      if (isCriticalFeature(featureForRoute(name))) return 0.5;

      return inheritOrSampleWith(0.05);
    },
    profilesSampleRate: 0.2,

    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    enableAutoSessionTracking: true,

    ignoreErrors: IGNORED_ERRORS,

    integrations: [
      routingInstrumentation,
      Sentry.reactNativeTracingIntegration(),
      Sentry.reactNativeErrorHandlersIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
      Sentry.breadcrumbsIntegration({ console: true, sentry: true }),
      Sentry.dedupeIntegration(),
      Sentry.extraErrorDataIntegration({ depth: 3 }),
      Sentry.reactNativeInfoIntegration(),
      Sentry.viewHierarchyIntegration(),
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true,
      }),
      Sentry.feedbackIntegration(),
    ],

    beforeSend(event, hint): ErrorEvent | null {
      try {
        const reshaped = processApiError(event, hint?.originalException);
        if (!reshaped) return null;

        const exception = reshaped.exception?.values?.[0];
        if (
          exception &&
          GENERIC_EXCEPTION_TITLE.test(exception.type ?? "") &&
          !reshaped.fingerprint
        ) {
          const signature = messageSignature(firstMessageOf(reshaped));
          if (signature) reshaped.fingerprint = ["fallback", signature];
        }

        return scrubEvent(reshaped);
      } catch {
        return event;
      }
    },

    beforeBreadcrumb(crumb) {
      if (crumb.category === "console" && isNoisyBreadcrumb(crumb.message)) {
        return null;
      }
      if (crumb.data?.url && typeof crumb.data.url === "string") {
        crumb.data.url = redactUrl(crumb.data.url);
      }
      return crumb;
    },

    beforeSendLog(log) {
      const body = typeof log.message === "string" ? log.message : undefined;
      if (isNoisyLog(body)) return null;

      if (body) log.message = redactString(body);
      if (log.attributes) log.attributes = redactDeep(log.attributes);
      return log;
    },
  });

  void attachBuildContext();
}

async function attachBuildContext(): Promise<void> {
  try {
    const Updates = await import("expo-updates");
    setBuildContext({
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    });
  } catch {
    setBuildContext({ channel: __DEV__ ? "development" : null });
  }
}

export {
  describeApiError,
  isActionableApiError,
  normalizeApiPath,
  statusClassOf,
} from "./apiErrors";
export * from "./context";
