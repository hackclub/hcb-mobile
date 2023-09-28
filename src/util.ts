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
