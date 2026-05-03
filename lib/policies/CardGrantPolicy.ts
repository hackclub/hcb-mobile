import GrantCard from "../types/GrantCard";

import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CardGrantPolicy extends OrgScopedPolicy<GrantCard> {
  override new(): boolean {
    return this.isAdmin || this.isReader;
  }

  override create(): boolean {
    return this.adminOrManager;
  }

  override show(): boolean {
    return this.isAuditor || this.isCardholder || this.isReader;
  }

  transactions(): boolean {
    return this.isAuditor || this.isCardholder || this.isReader;
  }

  spending(): boolean {
    return this.isPublic || this.isAuditor || this.isReader;
  }

  editActions(): boolean {
    return this.auditorOrManager;
  }
  editUsageRestrictions(): boolean {
    return this.auditorOrManager;
  }
  editExpiration(): boolean {
    return this.auditorOrManager;
  }
  editOverview(): boolean {
    return this.auditorOrManager;
  }
  editPurpose(): boolean {
    return this.auditorOrManager;
  }
  editBalance(): boolean {
    return this.auditorOrManager;
  }
  editTopup(): boolean {
    return this.auditorOrManager;
  }
  editWithdraw(): boolean {
    return this.auditorOrManager;
  }

  activate(): boolean {
    return (
      (this.isAdmin || this.isCardholder) && this.record.status === "active"
    );
  }

  cancel(): boolean {
    return (
      (this.adminOrManager || this.isCardholder) &&
      this.record.status === "active"
    );
  }

  convertToReimbursementReport(): boolean {
    return (
      (this.adminOrManager || this.isCardholder) &&
      this.record.status === "active"
    );
  }

  override edit(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }

  toggleOneTimeUse(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }

  topup(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }
  withdraw(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }
  permitMerchant(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }

  override update(): boolean {
    return this.adminOrManager && this.record.status === "active";
  }

  private get isCardholder(): boolean {
    return this.record.user.id === this.user?.id;
  }
}
