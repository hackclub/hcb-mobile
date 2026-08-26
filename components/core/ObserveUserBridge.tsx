import { useGlobalSearchParams } from "expo-router";
import { memo, useContext, useEffect } from "react";
import useSWR from "swr";

import AuthContext from "@/lib/auth/auth";
import { clearObserveAttributes, setObserveAttributes } from "@/lib/observe";
import User from "@/lib/types/User";

function ObserveUserBridge() {
  const { tokenResponse } = useContext(AuthContext);
  const hasToken = !!tokenResponse?.accessToken;
  const { data: user, isLoading } = useSWR<User>(hasToken ? "user" : null);

  const { id: organizationId } = useGlobalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (user?.id) {
      setObserveAttributes({ "user.id": String(user.id) });
    } else {
      clearObserveAttributes(["user.id"]);
    }
  }, [user]);

  useEffect(() => {
    setObserveAttributes({
      "auth.state": !hasToken
        ? "anonymous"
        : isLoading
          ? "refreshing"
          : "authenticated",
    });
  }, [hasToken, isLoading]);

  useEffect(() => {
    if (organizationId) {
      setObserveAttributes({ "organization.id": organizationId });
    } else {
      clearObserveAttributes(["organization.id"]);
    }
  }, [organizationId]);

  return null;
}

export default memo(ObserveUserBridge);
