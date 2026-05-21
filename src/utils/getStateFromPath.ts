import {
  PartialRoute,
  Route,
  getStateFromPath as _getStateFromPath,
} from "@react-navigation/native";
import { Linking } from "react-native";

import { StackParamList } from "../lib/NavigatorParamList";

export const getStateFromPath: typeof _getStateFromPath = (path, options) => {
  const donationRoutes = buildDonationStartRoutes(path);
  if (donationRoutes) {
    return {
      routes: [
        {
          name: "Home",
          state: {
            routes: donationRoutes,
            index: donationRoutes.length - 1,
          },
        },
      ],
    };
  }

  const state = _getStateFromPath(path, options);
  if (state) return state;

  const extractedOrg = extractOrgName(path);

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

  const match =
    path.match(/([^/]+)\/transactions/) || path.match(/([^/]+)\/ledger/);
  if (match) {
    const orgId = match[1];
    routes.push({ name: "Organizations" });
    routes.push({
      name: "Event",
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
            index: routes.length - 1,
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

function buildDonationStartRoutes(
  path: string,
): PartialRoute<Route<keyof StackParamList>>[] | undefined {
  const [pathname, search = ""] = path.split("?");
  const match = pathname.match(/^\/?donations\/start\/([^/?#]+)\/?$/);
  if (!match) return undefined;

  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
  const params = new URLSearchParams(search);

  const amountRaw = params.get("amount");
  const amount =
    amountRaw !== null && amountRaw !== "" && !Number.isNaN(Number(amountRaw))
      ? Number(amountRaw)
      : undefined;
  const name = params.get("name") ?? undefined;
  const email = params.get("email") ?? undefined;
  const message = params.get("message") ?? undefined;
  const goodsRaw = params.get("goods");
  const goods =
    goodsRaw === null ? undefined : goodsRaw === "true" || goodsRaw === "1";

  const donationParams: Record<string, unknown> = { orgId: slug };
  if (amount !== undefined) donationParams.amount = amount;
  if (name !== undefined) donationParams.name = name;
  if (email !== undefined) donationParams.email = email;
  if (message !== undefined) donationParams.message = message;
  if (goods !== undefined) donationParams.goods = goods;

  return [
    { name: "Organizations" },
    { name: "Event", params: { orgId: slug } },
    { name: "OrganizationDonation", params: donationParams },
  ];
}
