import * as Sentry from "@sentry/react-native";

import type { Feature } from "./sentry/context";

export type LogAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

interface ExceptionOptions {
  context?: string;
  feature?: Feature;
  attributes?: LogAttributes;
  fingerprint?: string[];
}

function toSentryAttributes(
  attributes: LogAttributes | undefined,
): Record<string, unknown> | undefined {
  if (!attributes) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) output[key] = value;
  }
  return output;
}

export const log = {
  debug(message: string, attributes?: LogAttributes): void {
    if (__DEV__) console.log(`[debug] ${message}`, attributes ?? "");
  },

  info(message: string, attributes?: LogAttributes): void {
    if (__DEV__) console.log(`[info] ${message}`, attributes ?? "");
  },

  warn(message: string, attributes?: LogAttributes): void {
    if (__DEV__) console.warn(message, attributes ?? "");
    Sentry.logger.warn(message, toSentryAttributes(attributes));
  },

  error(message: string, attributes?: LogAttributes): void {
    if (__DEV__) console.error(message, attributes ?? "");
    Sentry.logger.error(message, toSentryAttributes(attributes));
  },

  exception(error: unknown, options: ExceptionOptions = {}): void {
    if (__DEV__) {
      console.error(options.context ?? "Unhandled exception", error);
    }

    Sentry.withScope((scope) => {
      if (options.feature) scope.setTag("feature", options.feature);
      if (options.context) scope.setTag("error.context", options.context);
      if (options.fingerprint) scope.setFingerprint(options.fingerprint);
      if (options.attributes) {
        scope.setContext(
          "details",
          toSentryAttributes(options.attributes) ?? {},
        );
      }
      Sentry.captureException(error);
    });
  },
};

export default log;
