import User from "../types/User";

import { OrgScopedPolicy } from "./OrgScopedPolicy";

/** Minimal cardholder shape — mirrors StripeCardholder in HCB. */
export interface Cardholder {
  id: string;
  user: User;
}

export class CardholderPolicy extends OrgScopedPolicy<Cardholder> {
  override new(): boolean {
    return this.isAdmin || this.isSelf;
  }
  override create(): boolean {
    return this.isAdmin || this.isSelf;
  }

  override update(): boolean {
    return this.isAdmin || this.isOrgTeamMember;
  }

  updateProfile(): boolean {
    return this.isAdmin || this.isSelf;
  }

  private get isSelf(): boolean {
    return this.record.user.id === this.user?.id;
  }
}
