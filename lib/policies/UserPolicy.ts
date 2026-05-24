import User from "../types/User";

import { ApplicationPolicy } from "./ApplicationPolicy";

export class UserPolicy extends ApplicationPolicy<User> {
  override show(): boolean {
    return this.isAuditor || this.isSelf;
  }

  impersonate(): boolean {
    return this.isAdmin;
  }

  override edit(): boolean {
    return this.isAuditor || this.isSelf;
  }
  override update(): boolean {
    return this.isAdmin || this.isSelf;
  }

  generateTotp(): boolean {
    return this.isAdmin || this.isSelf;
  }
  enableTotp(): boolean {
    return this.isAdmin || this.isSelf;
  }
  disableTotp(): boolean {
    return this.isAdmin || this.isSelf;
  }

  generateBackupCodes(): boolean {
    return this.isSelf;
  }
  activateBackupCodes(): boolean {
    return this.isSelf;
  }
  disableBackupCodes(): boolean {
    return this.isAdmin || this.isSelf;
  }

  editAddress(): boolean {
    return this.isAuditor || this.isSelf;
  }
  editPayout(): boolean {
    return this.isAuditor || this.isSelf;
  }
  editFeaturePreviews(): boolean {
    return this.isAuditor || this.isSelf;
  }
  editSecurity(): boolean {
    return this.isAuditor || this.isSelf;
  }
  editNotifications(): boolean {
    return this.isAuditor || this.isSelf;
  }
  editIntegrations(): boolean {
    return this.isAuditor || this.isSelf;
  }

  adminDetails(): boolean {
    return this.isAuditor;
  }

  deleteProfilePicture(): boolean {
    return this.isAdmin || this.isSelf;
  }

  toggleSmsAuth(): boolean {
    return this.isAdmin || this.isSelf;
  }
  startSmsAuthVerification(): boolean {
    return this.isAdmin || this.isSelf;
  }
  completeSmsAuthVerification(): boolean {
    return this.isAdmin || this.isSelf;
  }

  receiptReport(): boolean {
    return this.isAdmin || this.isSelf;
  }

  enableFeature(): boolean {
    return this.isAdmin || this.isSelf;
  }
  disableFeature(): boolean {
    return this.isAdmin || this.isSelf;
  }

  logoutSession(): boolean {
    return this.isAdmin || this.isSelf;
  }
  logoutAll(): boolean {
    return this.isAdmin || this.isSelf;
  }

  private get isSelf(): boolean {
    return this.record.id === this.user?.id;
  }
}
