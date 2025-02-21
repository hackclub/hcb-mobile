import {
  PartialRoute,
  Route,
  getStateFromPath as _getStateFromPath,
} from "@react-navigation/native";
import { Linking } from "react-native";

import { StackParamList } from "./lib/NavigatorParamList";

export const getStateFromPath: typeof _getStateFromPath = (path, options) => {
  const state = _getStateFromPath(path, options);
  console.log("getStateFromPath", path, state);
  if (state) return state;

  const extractedOrg = extractOrgName(path);
  console.log("extractedOrg", extractedOrg);

  const routes: PartialRoute<Route<keyof StackParamList>>[] = [];

  if (extractedOrg) {
    routes.push({ name: "Organizations" });
    routes.push({ name: "Event", params: { orgId: extractedOrg.orgId } });

    if (extractedOrg.transactionId) {
      routes.push({
        name: "Transaction",
        params: {
          transactionId: extractedOrg.transactionId,
          orgId: extractedOrg.orgId,
        },
      });
    }
  }

  const match = path.match(/([^/]+)\/transactions/);
  if (match) {
    const orgId = match[1];
    console.log("transactions detected, orgId:", orgId);
    routes.push({
      name: "OrganizationLoader",
      params: { orgId },
    });
  }

  if (routes.length > 0) {
    return {
      routes: [
        {
          name: "Home",
          state: {
            routes,
          },
        },
      ],
    };
  }

  Linking.openURL(new URL(path, "https://hcb.hackclub.com").toString());
};

function extractOrgName(
  path: string,
): { orgId: string; transactionId?: string } | undefined {
  const match = path.match(/^\/?([^/#]+)(?:#([a-zA-Z0-9]+))?$/);
  if (!match) return undefined;

  if (match.length == 3) {
    return { orgId: match[1], transactionId: match[2] };
  } else {
    return { orgId: match[1] };
  }
}
