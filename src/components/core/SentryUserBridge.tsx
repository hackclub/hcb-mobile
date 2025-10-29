import { memo, useEffect } from "react";
import useSWR from "swr";
import User from "../../lib/types/User";
import * as Sentry from "@sentry/react-native";

function SentryUserBridge() {
    const { data: user } = useSWR<User>("user");
    useEffect(() => {
      console.log("user", user);
      if (user?.id) {
        Sentry.setUser({
          id: String(user.id),
          email: user.email ?? undefined,
          username: user.name ?? undefined,
        });
      } else {
        Sentry.setUser(null);
        Sentry.setContext("user", null as unknown as Record<string, unknown>);
      }
    }, [user]);
    return null;
  }

export default memo(SentryUserBridge);