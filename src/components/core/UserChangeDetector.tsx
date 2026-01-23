import AsyncStorage from "@react-native-async-storage/async-storage";
import { memo, useContext, useEffect, useRef } from "react";
import useSWR from "swr";

import AuthContext from "../../auth/auth";
import User from "../../lib/types/User";
import { useCache } from "../../providers/cacheProvider";

const THEME_KEY = "app_theme";
const BIOMETRICS_KEY = "biometrics_required";
const LAST_USER_ID_KEY = "last_logged_in_user_id";

async function clearUserData() {
  try {
    await AsyncStorage.multiRemove([
      THEME_KEY,
      BIOMETRICS_KEY,
      "organizationOrder",
      "canceledCardsShown",
      "ttpDidOnboarding",
      "hasSeenTapToPayBanner",
      "cardOrder",
    ]);
  } catch (error) {
    console.error("Error clearing user data", error);
  }
}

function UserChangeDetector() {
  const { tokenResponse } = useContext(AuthContext);
  const { data: user } = useSWR<User>(
    tokenResponse?.accessToken ? "user" : null,
  );
  const cache = useCache();
  const lastUserIdRef = useRef<string | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkUserChange = async () => {
      if (!user?.id) {
        if (lastUserIdRef.current !== null) {
          lastUserIdRef.current = null;
          hasCheckedRef.current = false;
        }
        return;
      }

      const currentUserId = String(user.id);

      if (!hasCheckedRef.current) {
        hasCheckedRef.current = true;
        const lastUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);

        if (lastUserId && lastUserId !== currentUserId) {
          console.log(
            `Different user detected (previous: ${lastUserId}, current: ${currentUserId}). Clearing data.`,
          );
          await clearUserData();
          cache.clear();
        }

        await AsyncStorage.setItem(LAST_USER_ID_KEY, currentUserId);
        lastUserIdRef.current = currentUserId;
      } else if (lastUserIdRef.current !== currentUserId) {
        console.log(
          `User ID changed during session (previous: ${lastUserIdRef.current}, current: ${currentUserId}). Clearing data.`,
        );
        await clearUserData();
        cache.clear();
        await AsyncStorage.setItem(LAST_USER_ID_KEY, currentUserId);
        lastUserIdRef.current = currentUserId;
      }
    };

    checkUserChange();
  }, [user?.id, cache]);

  return null;
}

export default memo(UserChangeDetector);
