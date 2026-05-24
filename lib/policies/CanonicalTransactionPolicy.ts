import Transaction from "../types/Transaction";

import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CanonicalTransactionPolicy extends OrgScopedPolicy<Transaction> {
  override show(): boolean {
    return this.auditorOrTeamMember;
  }

  override edit(): boolean {
    return this.adminOrTeamMember;
  }

  setCustomMemo(): boolean {
    return this.adminOrTeamMember;
  }

  setCategory(): boolean {
    return this.isAdmin;
  }

  export(): boolean {
    return this.adminOrTeamMember;
  }

  waiveFee(): boolean {
    return this.isAdmin;
  }
  unwaiveFee(): boolean {
    return this.isAdmin;
  }
  markBankFee(): boolean {
    return this.isAdmin;
  }

  private get auditorOrTeamMember(): boolean {
    return this.isAuditor || this.isOrgTeamMember;
  }

  private get adminOrTeamMember(): boolean {
    return this.isAdmin || this.isOrgTeamMember;
  }
}
