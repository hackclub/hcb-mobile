import { OrganizationExpanded } from "../types/Organization";
import User from "../types/User";

import { ApplicationPolicy } from "./ApplicationPolicy";
import { roleAtLeast } from "./helpers";

/**
 * Policy for Organization records (mirrors HCB's EventPolicy).
 * The record IS the org, so roles are resolved directly from record.users.
 */
export class OrgPolicy extends ApplicationPolicy<OrganizationExpanded> {
  constructor(user: User | null, record: OrganizationExpanded) {
    super(user, record);
  }

  override index(): boolean {
    return this.user !== null;
  }

  override show(): boolean {
    return this.isPublic || this.auditorOrReader;
  }
  showInV4(): boolean {
    return this.auditorOrReader;
  }

  // Aliases for event homepage sections
  teamStats(): boolean {
    return this.show();
  }
  recentActivity(): boolean {
    return this.show();
  }
  moneyMovement(): boolean {
    return this.show();
  }
  balanceTransactions(): boolean {
    return this.show();
  }
  merchantsChart(): boolean {
    return this.show();
  }
  categoriesChart(): boolean {
    return this.show();
  }
  transactionHeatmap(): boolean {
    return this.show();
  }

  transactions(): boolean {
    return this.show();
  }
  ledger(): boolean {
    return this.transactions();
  }

  override create(): boolean {
    return this.isAdmin;
  }
  override new(): boolean {
    return this.isAdmin;
  }

  toggleHidden(): boolean {
    return this.isAdmin;
  }

  balanceByDate(): boolean {
    return this.isPublic || this.auditorOrReader;
  }

  override edit(): boolean {
    return this.auditorOrMember;
  }

  pin(): boolean {
    return this.adminOrMember;
  }
  permitMerchant(): boolean {
    return this.adminOrMember;
  }

  override update(): boolean {
    return this.adminOrManager;
  }

  removeHeaderImage(): boolean {
    return this.update();
  }
  removeLogo(): boolean {
    return this.update();
  }
  enableFeature(): boolean {
    return this.update();
  }
  disableFeature(): boolean {
    return this.update();
  }
  toggleFeeWaiverEligible(): boolean {
    return this.update();
  }

  validateSlug(): boolean {
    return this.adminOrMember;
  }

  override destroy(): boolean {
    return this.isAdmin && this.record.playground_mode;
  }

  team(): boolean {
    return this.isPublic || this.auditorOrReader;
  }

  announcementOverview(): boolean {
    return this.isPublic || this.auditorOrReader;
  }
  feed(): boolean {
    return this.announcementOverview();
  }

  cardOverview(): boolean {
    return this.show() && !this.record.playground_mode;
  }
  cardOverviewInV4(): boolean {
    return this.showInV4() && this.cardOverview();
  }

  createStripeCard(): boolean {
    return this.adminOrMember && !this.record.playground_mode;
  }
  newStripeCard(): boolean {
    return this.createStripeCard();
  }

  documentation(): boolean {
    return this.auditorOrReader;
  }

  statements(): boolean {
    return this.show();
  }
  statementOfActivity(): boolean {
    return this.show() && this.isAuditor;
  }

  asyncBalance(): boolean {
    return this.show();
  }
  asyncSubOrganizationBalance(): boolean {
    return this.subOrganizations();
  }

  createTransfer(): boolean {
    return this.adminOrManager && !this.record.playground_mode;
  }
  newTransfer(): boolean {
    return this.auditorOrReader && !this.record.playground_mode;
  }

  transfers(): boolean {
    return this.show();
  }
  transfersInV4(): boolean {
    return this.showInV4() && this.transfers();
  }

  cardGrantOverview(): boolean {
    return this.isPublic || this.auditorOrReader;
  }
  bulkUploadCardGrants(): boolean {
    return this.adminOrManager;
  }

  promotions(): boolean {
    return this.auditorOrReader;
  }

  reimbursementsPendingReviewIcon(): boolean {
    return this.show();
  }
  reimbursements(): boolean {
    return this.auditorOrReader;
  }

  subOrganizations(): boolean {
    return this.isPublic || this.auditorOrReader;
  }
  subOrganizationsInV4(): boolean {
    return this.auditorOrReader && this.subOrganizations();
  }
  createSubOrganization(): boolean {
    return this.adminOrManager;
  }

  donationOverview(): boolean {
    return (
      this.show() &&
      !this.record.playground_mode &&
      this.record.donation_page_available
    );
  }
  donationPage(): boolean {
    return !this.record.playground_mode && this.record.donation_page_available;
  }

  invoices(): boolean {
    return this.show();
  }

  accountNumber(): boolean {
    return this.isAuditor || this.isMember;
  }

  toggleEventTag(): boolean {
    return this.isAdmin;
  }

  receiveGrant(): boolean {
    return this.auditorOrReader;
  }

  auditLog(): boolean {
    return this.isAuditor;
  }

  termination(): boolean {
    return this.isAuditor;
  }

  canInviteUser(): boolean {
    return this.adminOrManager;
  }

  claimPointOfContact(): boolean {
    return this.isAdmin;
  }

  activationFlow(): boolean {
    return this.isAdmin && this.record.playground_mode;
  }
  activate(): boolean {
    return this.isAdmin && this.record.playground_mode;
  }

  toggleScopedTag(): boolean {
    return this.adminOrManager;
  }

  // Private role helpers (record IS the org)
  private get isPublic(): boolean {
    return this.record.transparent;
  }
  private get isReader(): boolean {
    return roleAtLeast(this.user, this.record, "reader");
  }
  private get isMember(): boolean {
    return roleAtLeast(this.user, this.record, "member");
  }
  private get isManager(): boolean {
    return roleAtLeast(this.user, this.record, "manager");
  }

  private get adminOrMember(): boolean {
    return this.isAdmin || this.isMember;
  }
  private get adminOrManager(): boolean {
    return this.isAdmin || this.isManager;
  }
  private get auditorOrReader(): boolean {
    return this.isAuditor || this.isReader;
  }
  private get auditorOrMember(): boolean {
    return this.isAuditor || this.isMember;
  }
}
