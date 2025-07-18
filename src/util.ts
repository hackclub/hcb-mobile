import words from "lodash/words";

import Organization from "./lib/types/Organization";
import { palette } from "./theme";

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
