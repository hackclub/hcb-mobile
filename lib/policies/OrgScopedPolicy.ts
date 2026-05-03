import { OrganizationExpanded } from "../types/Organization";
import User from "../types/User";
import { ApplicationPolicy } from "./ApplicationPolicy";
import { isTeamMember, roleAtLeast } from "./helpers";

/**
 * Base class for policies whose record belongs to an organization.
 * Provides role helpers derived from the org's user list.
 */
export class OrgScopedPolicy<TRecord = unknown> extends ApplicationPolicy<TRecord> {
  constructor(
    user: User | null,
    record: TRecord,
    protected org: OrganizationExpanded | null,
  ) {
    super(user, record);
  }

  protected get isPublic(): boolean { return this.org?.transparent ?? false; }
  protected get isPlaygroundMode(): boolean { return this.org?.playground_mode ?? false; }

  protected get isReader(): boolean { return roleAtLeast(this.user, this.org, "reader"); }
  protected get isMember(): boolean { return roleAtLeast(this.user, this.org, "member"); }
  protected get isManager(): boolean { return roleAtLeast(this.user, this.org, "manager"); }
  protected get isOrgTeamMember(): boolean { return isTeamMember(this.user, this.org); }

  protected get adminOrMember(): boolean { return this.isAdmin || this.isMember; }
  protected get adminOrManager(): boolean { return this.isAdmin || this.isManager; }
  protected get adminOrReader(): boolean { return this.isAdmin || this.isReader; }
  protected get auditorOrReader(): boolean { return this.isAuditor || this.isReader; }
  protected get auditorOrMember(): boolean { return this.isAuditor || this.isMember; }
  protected get auditorOrManager(): boolean { return this.isAuditor || this.isManager; }
}
