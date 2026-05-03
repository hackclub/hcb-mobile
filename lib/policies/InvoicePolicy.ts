import { Invoice } from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class InvoicePolicy extends OrgScopedPolicy<Invoice> {
  override index(): boolean { return this.isAuditor || this.isReader; }

  override new(): boolean { return this.isPublic || this.isReader; }

  override create(): boolean { return this.isMember; }

  override show(): boolean { return this.isPublic || this.auditorOrReader; }

  archive(): boolean { return this.adminOrManager; }
  void(): boolean { return this.adminOrManager; }
  unarchive(): boolean { return this.adminOrManager; }
  manuallyMarkAsPaid(): boolean { return this.adminOrManager; }

  hosted(): boolean { return this.auditorOrReader; }
  pdf(): boolean { return this.auditorOrReader; }

  refund(): boolean { return this.isAdmin; }

  showInV4(): boolean { return this.auditorOrReader; }
}
