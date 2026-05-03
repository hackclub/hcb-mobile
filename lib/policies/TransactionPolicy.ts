import Transaction from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class TransactionPolicy extends OrgScopedPolicy<Transaction> {
  override show(): boolean { return this.auditorOrTeamMember; }

  override edit(): boolean { return this.adminOrTeamMember; }
  override update(): boolean { return this.adminOrTeamMember; }

  export(): boolean { return this.auditorOrTeamMember; }

  private get auditorOrTeamMember(): boolean {
    return this.isAuditor || this.isReader;
  }

  private get adminOrTeamMember(): boolean {
    return this.isAdmin || this.isMember;
  }
}
