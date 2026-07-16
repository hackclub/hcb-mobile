import * as WebBrowser from "expo-web-browser";

import { palette } from "@/styles/theme";
import { BASE } from "@/utils/shareUrl";

export async function openOnWebsite(pathOrUrl: string) {
  const url = /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,
      controlsColor: palette.primary,
      dismissButtonStyle: "cancel",
    });
  } catch (error) {
    console.error("Failed to open URL in browser", error, {
      context: { url },
    });
  }
}
