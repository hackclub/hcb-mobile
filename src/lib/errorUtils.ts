import * as Sentry from "@sentry/react-native";

// Define more specific types for better type safety
export type ErrorContext = Record<string, unknown> | undefined;
export type SentryTags = Record<string, string | number | boolean>;

export interface LogErrorOptions {
  context?: ErrorContext;
  shouldReportToSentry?: boolean;
  tags?: SentryTags;
  level?: Sentry.SeverityLevel;
}

export const logError = (
  message: string, 
  error: unknown, 
  options: LogErrorOptions = {}
) => {
  const {
    context,
    shouldReportToSentry = false,
    tags = {},
    level = 'error'
  } = options;

  // Always log to console for debugging
  console.error(message, error);
  
  // Only send to Sentry for critical errors
  if (shouldReportToSentry) {
    const sentryError = error instanceof Error ? error : new Error(String(error));
    
    Sentry.captureException(sentryError, {
      tags: { 
        context: message,
        ...tags 
      },
      extra: context,
      level
    });
  }
};

// Convenience functions for common error patterns
export const logCriticalError = (
  message: string,
  error: unknown,
  context?: ErrorContext,
  tags?: SentryTags
) => {
  logError(message, error, {
    context,
    shouldReportToSentry: true,
    tags,
    level: 'fatal'
  });
};

export const logWarning = (
  message: string,
  error: unknown,
  context?: ErrorContext
) => {
  logError(message, error, {
    context,
    shouldReportToSentry: false,
    level: 'warning'
  });
};

export const logInfo = (
  message: string,
  error: unknown,
  context?: ErrorContext
) => {
  logError(message, error, {
    context,
    shouldReportToSentry: false,
    level: 'info'
  });
};