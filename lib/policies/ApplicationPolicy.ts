import User from "../types/User";

export class ApplicationPolicy<TRecord = unknown> {
  constructor(
    protected user: User | null,
    protected record: TRecord,
  ) {}

  index(): boolean {
    return false;
  }
  show(): boolean {
    return false;
  }
  create(): boolean {
    return false;
  }
  new(): boolean {
    return this.create();
  }
  update(): boolean {
    return false;
  }
  edit(): boolean {
    return this.update();
  }
  destroy(): boolean {
    return false;
  }

  protected get isAdmin(): boolean {
    return this.user?.admin ?? false;
  }
  protected get isAuditor(): boolean {
    return this.user?.auditor ?? false;
  }
}
