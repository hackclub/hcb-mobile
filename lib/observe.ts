import { Observe, type ObserveAttributes } from "expo-observe";
import * as Updates from "expo-updates";

const DISPATCH_FROM_DEV_BUILDS = process.env.EXPO_PUBLIC_OBSERVE_DEBUG === "1";

const FILTERED_ROUTE_PARAMS = [
  "id",
  "cardId",
  "depositId",
  "donationId",
  "reportId",
  "transactionId",
  "positionId",
  "orgSlug",
  "name",
  "card",
  "invitation",
  "fallbackData",
  "filters",
  "images",
  "missingTransactions",
];

let globalAttributes: ObserveAttributes = {};

export function initObserve(): void {
  Observe.configure({
    environment: __DEV__ ? "development" : (Updates.channel ?? "production"),
    dispatchInDebug: DISPATCH_FROM_DEV_BUILDS,
    integrations: {
      "expo-router": { filteredParams: FILTERED_ROUTE_PARAMS },
    },
  });

  setObserveAttributes({
    "app.channel": Updates.channel ?? "unknown",
    "app.update_kind": Updates.isEmbeddedLaunch ? "embedded" : "ota",
    "app.runtime_version": Updates.runtimeVersion ?? "unknown",
  });
}

// setGlobalAttributes replaces the whole set instead of merging.
export function setObserveAttributes(patch: ObserveAttributes): void {
  globalAttributes = { ...globalAttributes, ...patch };
  Observe.setGlobalAttributes(globalAttributes);
}

export function clearObserveAttributes(keys: string[]): void {
  if (!keys.some((key) => key in globalAttributes)) return;
  globalAttributes = Object.fromEntries(
    Object.entries(globalAttributes).filter(([key]) => !keys.includes(key)),
  );
  Observe.setGlobalAttributes(globalAttributes);
}

export { Observe };
