import { OrganizationExpanded } from "../types/Organization";
import User from "../types/User";

export type Role = "reader" | "member" | "manager";

const ROLE_LEVELS: Record<Role, number> = {
  reader: 1,
  member: 2,
  manager: 3,
};

export function roleAtLeast(
  user: User | null,
  org: OrganizationExpanded | null,
  minRole: Role,
): boolean {
  if (!user || !org) return false;
  const orgUser = org.users.find((u) => u.id === user.id);
  if (!orgUser?.role) return false;
  return ROLE_LEVELS[orgUser.role] >= ROLE_LEVELS[minRole];
}

export function isTeamMember(
  user: User | null,
  org: OrganizationExpanded | null,
): boolean {
  if (!user || !org) return false;
  return org.users.some((u) => u.id === user.id);
}
