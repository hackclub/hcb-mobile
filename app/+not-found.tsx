import { router, usePathname } from "expo-router";
import { useEffect } from "react";

import { openOnWebsite } from "@/utils/handoff";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    openOnWebsite(pathname);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [pathname]);

  return null;
}
