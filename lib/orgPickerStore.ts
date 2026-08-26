// Passes the organization chosen in the org-picker bottom sheet back to the
// screen that opened it. Mirrors the paymentStore pattern: a plain module
// value, consumed once by the opener via useFocusEffect on return. Only one
// picker flow is ever in-flight at a time, so a single slot is sufficient.

let pendingOrgId: string | null = null;

export function setPendingOrg(id: string) {
  pendingOrgId = id;
}

// Returns the pending selection and clears it so it isn't re-applied.
export function consumePendingOrg(): string | null {
  const id = pendingOrgId;
  pendingOrgId = null;
  return id;
}
