import Transaction from "../types/Transaction";

import { OrgPolicy } from "./OrgPolicy";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class WirePolicy extends OrgScopedPolicy<Transaction> {
  override new(): boolean {
    return this.isAdmin || this.isReader;
  }

  override create(): boolean {
    return this.canTransfer;
  }

  approve(): boolean {
    return this.isAdmin;
  }
  sendWire(): boolean {
    return this.isAdmin;
  }
  reject(): boolean {
    return this.canTransfer;
  }

  override edit(): boolean {
    return this.isAdmin;
  }
  override update(): boolean {
    return this.isAdmin;
  }

  private get canTransfer(): boolean {
    if (!this.org) return false;
    return new OrgPolicy(this.user, this.org).createTransfer();
  }
}
