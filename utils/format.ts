import words from "lodash/words";

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
  if (
    status === "deposited" ||
    status === "completed" ||
    status === "reimbursement_approved" ||
    status === "reimbursed"
  ) {
    return palette.success;
  } else if (status === "in_transit" || status === "issued") {
    return palette.info;
  } else if (status === "rejected") {
    return palette.red;
  } else if (status === "reimbursement_requested") {
    return palette.purple;
  } else if (status === "reversed") {
    return palette.orange;
  } else {
    return palette.muted;
  }
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
