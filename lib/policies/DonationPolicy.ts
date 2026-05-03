import { TransactionDonation } from "../types/Transaction";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class DonationPolicy extends OrgScopedPolicy<TransactionDonation> {
  override show(): boolean { return this.isReader || this.isAuditor; }

  override create(): boolean { return this.isReader || this.isAdmin; }

  startDonation(): boolean {
    return this.org?.donation_page_available ?? false;
  }

  makeDonation(): boolean {
    return (this.org?.donation_page_available ?? false) && !this.isPlaygroundMode;
  }

  override index(): boolean { return this.isAuditor; }

  export(): boolean { return this.isReader || this.isAuditor; }
  exportDonors(): boolean { return this.isReader || this.isAuditor; }

  override update(): boolean { return this.isManager || this.isAdmin; }

  refund(): boolean { return this.isAdmin; }
}
