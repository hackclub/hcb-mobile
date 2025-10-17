import { Merchant, Category } from "@thedev132/yellowpages";
import words from "lodash/words";

import { logError } from "../lib/errorUtils";
import Organization from "../lib/types/Organization";
import { palette } from "../styles/theme";

export function renderMoney(cents: number) {
  return (
    (cents < 0 ? "-" : "") +
    "$" +
    (Math.abs(cents) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })
  );
}

export function renderDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // Prevent JS from doing timezone conversion
  });
}

export function statusColor(status: string) {
  if (status == "deposited" || status == "completed") {
    return palette.success;
  } else if (status == "in_transit" || status == "issued") {
    return palette.info;
  } else if (status == "rejected") {
    return palette.primary;
  } else {
    return palette.muted;
  }
}

export function orgColor(orgId: string) {
  const colors = [
    "#ec3750",
    "#ff8c37",
    "#f1c40f",
    "#33d6a6",
    "#5bc0de",
    "#338eda",
    "#a633d6",
  ];

  return colors[Math.floor(orgId.charCodeAt(4) % colors.length)];
}

export function redactedCardNumber(last4?: string) {
  return `•••• •••• •••• ${last4 || "••••"}`;
}

export function renderCardNumber(number: string) {
  return words(number, /\d{4}/g).join(" ");
}

export const normalizeSvg = (
  svg: string,
  width: number,
  height: number,
  scaleFactor: number = 1.25,
): string => {
  return svg.replace(
    "<svg",
    `<svg preserveAspectRatio="xMinYMin slice" viewBox="0 0 ${width / scaleFactor} ${height / scaleFactor}"`,
  );
};

export function organizationOrderEqual(a: Organization[], b: Organization[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

export const formatMerchantNames = async (
  merchantIds: string[] | undefined,
) => {
  if (!merchantIds || merchantIds.length === 0) {
    return "All";
  }

  try {
    await Merchant.initialize();

    const merchantNames: string[] = [];
    const validIds = merchantIds.filter((id): id is string => !!id);
    const unnamedCount = validIds.filter((id) => {
      const merchant = Merchant.lookup({ networkId: id });
      if (merchant.inDataset()) {
        const name = merchant.getName();
        if (name && !merchantNames.includes(name)) {
          merchantNames.push(name);
        }
        return false;
      }
      return true;
    }).length;

    // Add unnamed merchants count if any
    if (unnamedCount > 0) {
      merchantNames.push(`Unnamed Merchants (${unnamedCount})`);
    }

    return merchantNames.join(", ");
  } catch (error) {
    logError("Error formatting merchant names", error, {
      context: { merchantIds: merchantIds },
    });
    return "Loading...";
  }
};

export const formatCategoryNames = async (
  categoryIds: string[] | undefined,
) => {
  await Category.initialize();
  if (!categoryIds || categoryIds.length === 0) {
    return "All";
  }

  try {
    const categoryNames: string[] = [];
    const validIds = categoryIds.filter((id): id is string => !!id);
    const unnamedCount = validIds.filter((id) => {
      const category = Category.lookup({ key: id });
      if (category.inDataset()) {
        const name = category.getName();
        if (name && !categoryNames.includes(name)) {
          categoryNames.push(name);
        }
        return false;
      }
      return true;
    }).length;

    if (unnamedCount > 0) {
      categoryNames.push(`Unnamed Categories (${unnamedCount})`);
    }

    return categoryNames.join(", ");
  } catch (error) {
    logError("Error formatting category names", error, {
      context: { categoryIds: categoryIds },
    });
    return "Loading...";
  }
};
