import {
  PartialRoute,
  Route,
  getStateFromPath as _getStateFromPath,
} from "@react-navigation/native";
import { Linking } from "react-native";

import { StackParamList } from "./lib/NavigatorParamList";

export const getStateFromPath: typeof _getStateFromPath = (path, options) => {
  const state = _getStateFromPath(path, options);

  if (state) return state;

  const extractedOrg = extractOrgName(path);

  if (extractedOrg) {
    const routes: PartialRoute<Route<keyof StackParamList>>[] = [
      { name: "Organizations" },
      { name: "Event", params: { orgId: extractedOrg.orgId } },
    ];

    if (extractedOrg.transactionId) {
      routes.push({
        name: "Transaction",
        params: {
          transactionId: extractedOrg.transactionId,
          orgId: extractedOrg.orgId,
        },
      });
    }

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
