declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE: string;
    EXPO_PUBLIC_CLIENT_ID: string;
    EXPO_PUBLIC_STRIPE_API_KEY: string;
    EXPO_PUBLIC_HELPSCOUT_BEACON_ID: string;
    EXPO_PUBLIC_SENTRY_DSN: string;
    /** Set to "1" to send events from a dev build. Off by default. */
    EXPO_PUBLIC_SENTRY_DEBUG?: string;
  }
}
