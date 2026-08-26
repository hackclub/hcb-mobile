import * as Linking from "expo-linking";

import { BASE } from "@/utils/shareUrl";

export async function openOnWebsite(pathOrUrl: string) {
  const url = /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error("Failed to open URL in browser", error, {
      context: { url },
    });
  }
}
