import Appsignal from "@appsignal/javascript";

export const appsignal = new Appsignal({
  key: process.env.EXPO_PUBLIC_APPSIGNAL_API_KEY,
});

const originalErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    appsignal.sendError(error);
  } catch (e) {
    console.error("[AppSignal] Failed to send error:", e);
  }

  originalErrorHandler(error, isFatal);
});
