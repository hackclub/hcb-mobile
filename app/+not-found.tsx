import { router, useUnstableGlobalHref } from "expo-router";
import { useEffect } from "react";

import { openOnWebsite } from "@/utils/handoff";

export default function NotFound() {
  const href = useUnstableGlobalHref();

  useEffect(() => {
    openOnWebsite(href);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [href]);

  return null;
}
