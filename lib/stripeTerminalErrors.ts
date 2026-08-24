import { ErrorCode } from "@stripe/stripe-terminal-react-native";
import { Platform } from "react-native";

export type TerminalErrorLike = {
  code?: string;
  message?: string;
  nativeErrorCode?: string;
};

export type TerminalErrorCopy = {
  title: string;
  message: string;
  code?: string;
};

const tapToPay = Platform.OS === "ios" ? "Tap to Pay on iPhone" : "Tap to Pay";

const COPY: Record<string, TerminalErrorCopy> = {
  [ErrorCode.TAP_TO_PAY_INSECURE_ENVIRONMENT]: {
    title: "Turn off Developer options",
    message: `${tapToPay} can't run while Developer options, USB debugging, or wireless debugging are enabled. Turn them off in Settings → System → Developer options, then try again.`,
  },
  [ErrorCode.TAP_TO_PAY_DEBUG_NOT_SUPPORTED]: {
    title: "Debug build not supported",
    message: `${tapToPay} can't run in a debuggable build of the app. Install a release build to accept payments.`,
  },
  [ErrorCode.TAP_TO_PAY_UNSUPPORTED_DEVICE]: {
    title: "Device not supported",
    message: `This device can't accept ${tapToPay} payments. It needs an NFC sensor, Google Mobile Services, and a recent security update.`,
  },
  [ErrorCode.TAP_TO_PAY_UNSUPPORTED_ANDROID_VERSION]: {
    title: "Android version too old",
    message: `${tapToPay} requires Android 13 or later. Update this device to accept payments.`,
  },
  [ErrorCode.TAP_TO_PAY_UNSUPPORTED_PROCESSOR]: {
    title: "Device not supported",
    message: `${tapToPay} isn't supported on this device's processor.`,
  },
  [ErrorCode.TAP_TO_PAY_DEVICE_TAMPERED]: {
    title: "Device not secure",
    message: `${tapToPay} can't run on a rooted device or one with an unlocked bootloader.`,
  },
  [ErrorCode.TAP_TO_PAY_NFC_DISABLED]: {
    title: "Turn on NFC",
    message: `${tapToPay} needs NFC. Turn it on in your device settings, then try again.`,
  },
  [ErrorCode.TAP_TO_PAY_LIBRARY_NOT_INCLUDED]: {
    title: "Tap to Pay unavailable",
    message: `This build of the app doesn't include ${tapToPay} support. Please report this to HCB.`,
  },
  [ErrorCode.TAP_TO_PAY_PIN_UNAVAILABLE]: {
    title: "Can't collect a PIN",
    message:
      "This payment needs a PIN, which can't be collected right now. Close any screen recorders, accessibility services, or overlay apps and try again.",
  },
  [ErrorCode.TAP_TO_PAY_READER_MERCHANT_BLOCKED]: {
    title: "Account blocked",
    message: `This account isn't allowed to accept ${tapToPay} payments. Contact HCB for help.`,
  },
  [ErrorCode.TAP_TO_PAY_READER_REQUEST_INTERRUPTED]: {
    title: "Payment interrupted",
    message: "The payment was interrupted before it finished. Try again.",
  },
  [ErrorCode.LOCATION_SERVICES_DISABLED]: {
    title: "Turn on location",
    message:
      "Stripe requires your location to accept in-person payments. Turn on location services and grant HCB location access, then try again.",
  },
  [ErrorCode.BLUETOOTH_PERMISSION_DENIED]: {
    title: "Bluetooth permission needed",
    message:
      "HCB needs Bluetooth permission to set up payments. Grant it in your device settings, then try again.",
  },
  [ErrorCode.NOT_CONNECTED_TO_READER]: {
    title: "Reader disconnected",
    message: `${tapToPay} lost its connection. Go back and start the donation again.`,
  },
  [ErrorCode.READER_BUSY]: {
    title: "Reader busy",
    message: "Another payment is still finishing. Wait a moment and try again.",
  },
  [ErrorCode.FEATURE_NOT_ENABLED_ON_ACCOUNT]: {
    title: "Not enabled on this account",
    message: `${tapToPay} isn't enabled for this organization's Stripe account. Contact HCB for help.`,
  },
  [ErrorCode.CONNECTION_TOKEN_PROVIDER_ERROR]: {
    title: "Couldn't authenticate",
    message:
      "HCB couldn't get permission from Stripe to take this payment. Check your connection, or sign out and back in.",
  },
  [ErrorCode.SESSION_EXPIRED]: {
    title: "Session expired",
    message: "Your payment session expired. Go back and start again.",
  },
  [ErrorCode.STRIPE_API_CONNECTION_ERROR]: {
    title: "No connection to Stripe",
    message:
      "HCB couldn't reach Stripe. Check your internet connection and try again.",
  },
  [ErrorCode.REQUEST_TIMED_OUT]: {
    title: "Request timed out",
    message:
      "Stripe took too long to respond. Check your connection and try again.",
  },
  [ErrorCode.CARD_READ_TIMED_OUT]: {
    title: "Card not read",
    message: "The card wasn't read in time. Try tapping it again.",
  },
  [ErrorCode.CARD_REMOVED]: {
    title: "Card removed too soon",
    message: "Hold the card against the device until the payment completes.",
  },
  [ErrorCode.CARD_NOT_SUPPORTED]: {
    title: "Card not supported",
    message: "This card can't be used here. Ask the donor for another card.",
  },
  [ErrorCode.DECLINED_BY_READER]: {
    title: "Card declined",
    message: "The card was declined. Ask the donor for another card.",
  },
  [ErrorCode.DECLINED_BY_STRIPE_API]: {
    title: "Card declined",
    message: "Stripe declined this card. Ask the donor for another card.",
  },
  [ErrorCode.CANCELED]: {
    title: "Payment canceled",
    message: "The payment was canceled.",
  },
};

export function describeTerminalError(
  error: TerminalErrorLike | null | undefined,
  fallback: TerminalErrorCopy,
): TerminalErrorCopy {
  if (!error) return fallback;

  const code = error.code || error.nativeErrorCode;
  const known = code ? COPY[code] : undefined;
  if (known) return { ...known, code };

  if (error.message) {
    return { title: fallback.title, message: error.message, code };
  }

  return {
    title: fallback.title,
    message: code ? `${fallback.message} (${code})` : fallback.message,
    code,
  };
}
