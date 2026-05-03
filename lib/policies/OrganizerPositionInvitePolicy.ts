import Invitation from "../types/Invitation";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class OrganizerPositionInvitePolicy extends OrgScopedPolicy<Invitation> {
  override index(): boolean { return this.isAuditor || this.isOrgTeamMember; }

  override new(): boolean { return this.adminOrManager; }
  override create(): boolean { return this.adminOrManager; }

  override show(): boolean { return this.isAuditor; }

  /** Only the recipient can accept their own invitation. */
  accept(): boolean { return true; /* Current user's own invitations fetched via user/invitations */ }

  /** Only the recipient can reject their own invitation. */
  reject(): boolean { return true; }

  cancel(): boolean {
    return this.adminOrManager || this.isSender;
  }

  override destroy(): boolean { return this.cancel(); }

  resend(): boolean {
    return this.adminOrManager || this.isSender;
  }

  changePositionRole(): boolean { return this.adminOrManager; }

  sendContract(): boolean { return this.isAdmin; }

  private get isSender(): boolean {
    return this.record.sender?.id === this.user?.id;
  }
}
