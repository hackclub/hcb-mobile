import Card from "../types/Card";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class CardPolicy extends OrgScopedPolicy<Card> {
  override index(): boolean { return this.isAuditor; }

  shipping(): boolean { return this.isAuditor || this.isReader; }

  freeze(): boolean {
    return this.adminOrManager || this.memberAndCardholder;
  }

  defrost(): boolean {
    const frozenByOther =
      this.record.last_frozen_by != null &&
      this.record.last_frozen_by.id !== this.user?.id &&
      !this.adminOrManager;
    if (frozenByOther) return false;
    return this.freeze();
  }

  cancel(): boolean { return this.adminOrManager || this.memberAndCardholder; }

  activate(): boolean {
    return (this.isAdmin || this.memberAndCardholder) && this.record.status !== "canceled";
  }

  override show(): boolean {
    return this.isAuditor || this.isReader || this.isCardholder;
  }

  override edit(): boolean { return this.adminOrManager || this.memberAndCardholder; }
  override update(): boolean { return this.adminOrManager || this.memberAndCardholder; }

  transactions(): boolean {
    return this.isAuditor || this.isReader || this.isCardholder;
  }

  ephemeralKeys(): boolean { return this.isCardholder; }

  enableCashWithdrawal(): boolean { return this.isAdmin; }

  private get isCardholder(): boolean {
    return this.record.user.id === this.user?.id;
  }

  private get memberAndCardholder(): boolean {
    return this.isMember && this.isCardholder;
  }
}
