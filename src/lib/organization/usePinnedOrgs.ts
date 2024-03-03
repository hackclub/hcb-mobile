import AsyncStorage from "@react-native-async-storage/async-storage";
import orderBy from "lodash/orderBy";
import { useEffect, useMemo, useState } from "react";

import Organization from "../types/Organization";

export default function usePinnedOrgs(
  organizations: Organization[] | undefined,
) {
  const [pinnedOrgs, setPinnedOrgs] = useState<{
    [id: Organization["id"]]: boolean;
  }>({});

  useEffect(() => {
    AsyncStorage.getItem("pinnedOrgs").then((_pinnedOrgs) => {
      if (_pinnedOrgs) {
        setPinnedOrgs(JSON.parse(_pinnedOrgs));
      }
    });
  }, []);

  const orgs = useMemo(
    () =>
      organizations === undefined
        ? []
        : orderBy(
            organizations.map<Organization & { pinned: boolean }>((o) => ({
              ...o,
              pinned: !!pinnedOrgs[o.id],
            })),
            ["pinned"],
            ["desc"],
          ),
    [organizations, pinnedOrgs],
  );

  return [
    orgs,
    (orgId: Organization["id"]) => {
      setPinnedOrgs((_pinnedOrgs) => {
        const newOrgs = {
          ..._pinnedOrgs,
          [orgId]: !_pinnedOrgs[orgId],
        };
        AsyncStorage.setItem("pinnedOrgs", JSON.stringify(newOrgs));

        return newOrgs;
      });
    },
  ] as const;
}
