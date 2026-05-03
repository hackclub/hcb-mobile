import Comment from "../types/Comment";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CommentPolicy extends OrgScopedPolicy<Comment> {
  override new(): boolean { return this.isAuditor || this.isOrgTeamMember; }

  override create(): boolean {
    if (this.record.admin_only && !this.isAuditor) return false;
    return this.isAuditor || this.isOrgTeamMember;
  }

  override edit(): boolean { return this.isAuthor && this.isOrgTeamMember || this.isAdmin; }
  override update(): boolean { return this.edit(); }
  override destroy(): boolean { return this.edit(); }

  override show(): boolean {
    return this.isAuditor || (this.isOrgTeamMember && !this.record.admin_only);
  }

  react(): boolean { return this.show(); }

  private get isAuthor(): boolean {
    return this.record.user.id === this.user?.id;
  }
}
