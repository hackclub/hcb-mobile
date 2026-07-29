import NetInfo from "@react-native-community/netinfo";
import * as Sentry from "@sentry/react-native";
import { useGlobalSearchParams, useSegments } from "expo-router";
import { memo, useContext, useEffect } from "react";
import useSWR from "swr";

import AuthContext from "@/lib/auth/auth";
import {
  SEND_USER_PII,
  setActiveRoute,
  setAuthState,
  setNetworkContext,
  setOrganizationContext,
} from "@/lib/sentry";
import User from "@/lib/types/User";

function SentryUserBridge() {
  const { tokenResponse } = useContext(AuthContext);
  const hasToken = !!tokenResponse?.accessToken;
  const { data: user, isLoading } = useSWR<User>(hasToken ? "user" : null);

  const segments = useSegments();
  const { id: organizationId } = useGlobalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (user?.id) {
      Sentry.setUser(
        SEND_USER_PII
          ? {
              id: String(user.id),
              email: user.email ?? undefined,
              name: user.name ?? undefined,
            }
          : { id: String(user.id) },
      );
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  useEffect(() => {
    if (!hasToken) {
      setAuthState("anonymous");
    } else if (isLoading) {
      setAuthState("refreshing");
    } else {
      setAuthState("authenticated");
    }
  }, [hasToken, isLoading]);

  useEffect(() => {
    setActiveRoute(segments.join("/"));
  }, [segments]);

  useEffect(() => {
    setOrganizationContext(organizationId ? { id: organizationId } : null);
  }, [organizationId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkContext({
        isOnline: state.isConnected ?? false,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });
    return unsubscribe;
  }, []);

  return null;
}

export default memo(SentryUserBridge);
