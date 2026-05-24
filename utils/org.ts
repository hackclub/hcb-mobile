import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import ITransaction, {
  TransactionType,
  TransactionWithoutId,
} from "../lib/types/Transaction";
import { Category, Merchant } from "../lib/yellowpages";

export function orgColor(orgId: string) {
  const colors = [
    "#ec3750",
    "#ff8c37",
    "#f1c40f",
    "#33d6a6",
    "#5bc0de",
    "#338eda",
    "#a633d6",
  ];
  return colors[Math.floor(orgId.charCodeAt(4) % colors.length)];
}

export function organizationOrderEqual(a: Organization[], b: Organization[]) {
  if (a.length !== b.length) return false;
  return a.every((org, i) => org.id === b[i].id);
}

function formatEntityNames(
  ids: string[] | undefined,
  lookup: (id: string) => {
    inDataset: () => boolean;
    getName: () => string | null | undefined;
  },
  unnamedLabel: string,
): string {
  if (!ids || ids.length === 0) return "All";

  try {
    const names: string[] = [];
    const validIds = ids.filter((id): id is string => !!id);
    const unnamedCount = validIds.filter((id) => {
      const entity = lookup(id);
      if (entity.inDataset()) {
        const name = entity.getName();
        if (name && !names.includes(name)) {
          names.push(name);
        }
        return false;
      }
      return true;
    }).length;

    if (unnamedCount > 0) {
      names.push(`${unnamedLabel} (${unnamedCount})`);
    }

    return names.join(", ");
  } catch (error) {
    console.error(`Error formatting ${unnamedLabel.toLowerCase()}`, error, {
      context: { ids },
    });
    return "Loading...";
  }
}

export const formatMerchantNames = (merchantIds: string[] | undefined) =>
  formatEntityNames(
    merchantIds,
    (id) => Merchant.lookup({ networkId: id }),
    "Unnamed Merchants",
  );

export const formatCategoryNames = (categoryIds: string[] | undefined) =>
  formatEntityNames(
    categoryIds,
    (id) => Category.lookup({ key: id }),
    "Unnamed Categories",
  );

export function addPendingFeeToTransactions(
  transactions: ITransaction[],
  organization: Organization | OrganizationExpanded | undefined,
): TransactionWithoutId[] {
  if (
    transactions.length > 0 &&
    organization &&
    "fee_balance_cents" in organization &&
    organization.fee_balance_cents > 0
  ) {
    return [
      {
        amount_cents: -organization.fee_balance_cents,
        code: TransactionType.BankFee,
        date: "",
        pending: true,
        memo: "FISCAL SPONSORSHIP",
        has_custom_memo: false,
        declined: false,
        reversed: false,
        missing_receipt: false,
        lost_receipt: false,
      },
      ...transactions,
    ];
  }

  return transactions;
}
