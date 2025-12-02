import * as Sentry from "@sentry/react-native";
import { memo, useContext, useEffect } from "react";
import useSWR from "swr";

import AuthContext from "../../auth/auth";
import User from "../../lib/types/User";

function SentryUserBridge() {
  const { tokens } = useContext(AuthContext);
  const { data: user } = useSWR<User>(tokens?.accessToken ? "user" : null);
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
