import { TransactionCheckDeposit } from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CheckDepositPolicy extends OrgScopedPolicy<TransactionCheckDeposit> {
  override index(): boolean { return this.auditorOrReader && true; /* plan check skipped */ }

  override create(): boolean { return this.isMember && !this.isPlaygroundMode; }

  viewImage(): boolean {
    return (
      this.auditorOrManager ||
      (this.isReader && this.record.check_deposit.submitter.id === this.user?.id)
    );
  }

  toggleFronted(): boolean { return this.isAdmin; }
}
