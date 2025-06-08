import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";

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
    if (!organizations) return [];
    if (!orderMap || Object.keys(orderMap).length === 0) return organizations;
    return [...organizations].sort((a, b) => {
      const aIndex = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [organizations, orderMap]);

  const setOrder = (orgs: Organization[]) => {
    const newOrderMap = orgs.reduce(
      (acc, org, idx) => {
        acc[org.id] = idx;
        return acc;
      },
      {} as Record<string, number>,
    );
    setOrderMap(newOrderMap);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOrderMap));
  };

  return [orderedOrgs, setOrder] as const;
}
