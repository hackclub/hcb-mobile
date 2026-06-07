export interface ReimbursementReport {
  id: string;
  name: string;
  created_at: string;
  status:
    | "draft"
    | "submitted"
    | "reimbursement_requested"
    | "reimbursement_approved"
    | "reimbursed"
    | "rejected"
    | "reversed";
  currency: string;
  amount_cents: number;
  maximum_amount_cents: number | null;
  submitted_at: string | null;
  reimbursement_requested_at: string | null;
  reimbursement_approved_at: string | null;
  reimbursed_at: string | null;
  rejected_at: string | null;
  user: { id: string; full_name: string; avatar?: string } | string;
  reviewer: { id: string; full_name: string; avatar?: string } | string | null;
  organization: { id: string; name: string; slug: string } | string;
}

export interface Receipt {
  id: string;
  url: string;
  preview_url: string;
  filename: string;
  uploader: { id: string; full_name: string } | null;
}

export interface ReimbursementExpense {
  id: string;
  memo: string | null;
  description: string | null;
  category: string | null;
  expense_type: "standard" | "mileage" | "fee";
  amount_cents: number;
  value: number;
  status: "pending" | "approved";
  approved_at: string | null;
}

export const EXPENSE_CATEGORIES = [
  "Advertising / Marketing",
  "Customs Fees",
  "Dues & Subscriptions",
  "Equipment & Furniture",
  "Food & Entertainment",
  "Gifts",
  "Janitorial & Maintenance",
  "Mileage",
  "Office Supplies",
  "Postage & Shipping",
  "Prizes",
  "Project Supplies",
  "Software",
  "Taxes & Licenses",
  "Technical Infrastructure",
  "Training",
  "Travel",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function reportStatusText(
  status: ReimbursementReport["status"],
): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Review Requested";
    case "reimbursement_requested":
      return "Processing";
    case "reimbursement_approved":
      return "In Transit";
    case "reimbursed":
      return "Reimbursed";
    case "rejected":
      return "Rejected";
    case "reversed":
      return "Canceled";
  }
}

export function reportStatusColor(
  status: ReimbursementReport["status"],
): string {
  switch (status) {
    case "draft":
      return "#8c8c8c";
    case "submitted":
      return "#338eda";
    case "reimbursement_requested":
      return "#9a5fd4";
    case "reimbursement_approved":
    case "reimbursed":
      return "#33a854";
    case "rejected":
      return "#ec3750";
    case "reversed":
      return "#f5a623";
  }
}
