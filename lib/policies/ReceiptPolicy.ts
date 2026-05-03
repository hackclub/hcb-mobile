import Receipt from "../types/Receipt";
import { OrgScopedPolicy } from "./OrgScopedPolicy";

export class ReceiptPolicy extends OrgScopedPolicy<Receipt> {
  override destroy(): boolean {
    if (this.isAdmin) return true;
    // If no org context (receipt is unlinked in bin), only the uploader can delete it
    if (!this.org) return this.isUploader;
    // If org context provided, any member of the org can delete it
    return this.isMember;
  }

  /** Unlink a receipt from a transaction back to the receipt bin. */
  link(): boolean { return this.isUploader; }

  /** Move a receipt back to the bin (reverse of link). */
  reverse(): boolean { return this.isUploader; }

  private get isUploader(): boolean {
    return this.record.uploader?.id === this.user?.id;
  }
}
