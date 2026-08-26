import { OrgScopedPolicy } from "./OrgScopedPolicy";

/** Minimal Tag shape for policy checks. */
export interface Tag {
  id: string;
  name: string;
}

export class TagPolicy extends OrgScopedPolicy<Tag> {
  override create(): boolean {
    return this.isMember;
  }
  override update(): boolean {
    return this.isMember;
  }
  override destroy(): boolean {
    return this.isMember;
  }
  toggleTag(): boolean {
    return this.isMember;
  }
}
