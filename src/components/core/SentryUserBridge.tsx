import * as Sentry from "@sentry/react-native";
import { memo, useEffect } from "react";
import useSWR from "swr";

import User from "../../lib/types/User";

function SentryUserBridge() {
  const { data: user } = useSWR<User>("user");
  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({
        id: String(user.id),
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
  return null;
}

export default memo(SentryUserBridge);
