import { TransactionCheck } from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CheckPolicy extends OrgScopedPolicy<TransactionCheck> {
  override show(): boolean { return this.isPublic || this.isAuditor || this.isOrgTeamMember; }
}
