import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import Organization from "../types/Organization";

const STORAGE_KEY = "organizationOrder";

export default function useReorderedOrgs(
  organizations: Organization[] | undefined,
) {
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((savedOrder) => {
      if (savedOrder) {
        setOrderMap(JSON.parse(savedOrder));
      }
    });
  }, []);

  const orderedOrgs = useMemo(() => {
    const orgs = (organizations ?? []).filter((org) => !!org?.id);
    if (Object.keys(orderMap).length === 0) return orgs;
    return orgs.sort((a, b) => {
      const aIndex = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [organizations, orderMap]);

  const moveOrg = useCallback(
    (from: number, to: number) => {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
        return false;
      }
      if (
        from < 0 ||
        to < 0 ||
        from >= orderedOrgs.length ||
        to >= orderedOrgs.length
      ) {
        return false;
      }

      const reordered = [...orderedOrgs];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);

      const newOrderMap = reordered.reduce(
        (acc, org, idx) => {
          acc[org.id] = idx;
          return acc;
        },
        {} as Record<string, number>,
      );
      setOrderMap(newOrderMap);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOrderMap));
      return true;
    },
    [orderedOrgs],
  );

  return [orderedOrgs, moveOrg] as const;
}
