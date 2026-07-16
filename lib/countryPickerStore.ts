// Passes the country chosen in the country-picker bottom sheet back to the
// screen that opened it. Mirrors the orgPickerStore pattern: a plain module
// value, consumed once by the opener via useFocusEffect on return. Only one
// picker flow is ever in-flight at a time, so a single slot is sufficient.

let pendingCountry: string | null = null;

export function setPendingCountry(code: string) {
  pendingCountry = code;
}

// Returns the pending selection and clears it so it isn't re-applied.
export function consumePendingCountry(): string | null {
  const code = pendingCountry;
  pendingCountry = null;
  return code;
}
