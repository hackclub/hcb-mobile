import { TransactionAchTransfer } from "../types/Transaction";

import { OrgPolicy } from "./OrgPolicy";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class AchTransferPolicy extends OrgScopedPolicy<TransactionAchTransfer> {
  override new(): boolean {
    return this.isAdmin || this.isReader;
  }

  override create(): boolean {
    return this.canTransfer && !this.isPlaygroundMode;
  }

  override show(): boolean {
    return this.isPublic || this.canTransfer;
  }

  viewAccountRoutingNumbers(): boolean {
    return this.adminOrManager;
  }

  cancel(): boolean {
    return this.canTransfer;
  }

  transferConfirmationLetter(): boolean {
    return this.canTransfer;
  }

  startApproval(): boolean {
    return this.isAdmin;
  }
  approve(): boolean {
    return this.isAdmin;
  }
  reject(): boolean {
    return this.isAdmin;
  }
  toggleSpeed(): boolean {
    return this.isAdmin;
  }

  private get canTransfer(): boolean {
    if (!this.org) return false;
    return new OrgPolicy(this.user, this.org).createTransfer();
  }
}
