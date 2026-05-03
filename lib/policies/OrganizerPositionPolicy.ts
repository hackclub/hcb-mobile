import User from "../types/User";
import { OrgScopedPolicy } from "./OrgScopedPolicy";
import { Role } from "./helpers";

/** Minimal OrganizerPosition shape used for policy checks. */
export interface OrganizerPosition {
  id: string;
  user: User;
  role: Role;
  is_signee: boolean;
}

export class OrganizerPositionPolicy extends OrgScopedPolicy<OrganizerPosition> {
  override destroy(): boolean { return this.isAdmin || this.isSignee; }

  setIndex(): boolean { return this.isSelf; }
  markVisited(): boolean { return this.isSelf; }

  changePositionRole(): boolean {
    if (!this.user) return false;
    if (this.isSelf) return false;
    if (this.record.is_signee) return false;
    return this.adminOrManager;
  }

  canRequestRemoval(): boolean {
    return this.adminOrManager || this.isSelf;
  }

  viewAllowances(): boolean {
    return this.adminOrManager || this.isSelf || this.isAuditor;
  }

  private get isSelf(): boolean {
    return this.record.user.id === this.user?.id;
  }

  private get isSignee(): boolean {
    // The current user is the signee for this position's org
    return this.record.is_signee && this.isSelf;
  }
}
