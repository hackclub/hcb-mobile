import HcbApiObject from "./HcbApiObject";
import { OrgUser } from "./User";

export type PlanFeature =
  | "cards"
  | "card_grants"
  | "invoices"
  | "donations"
  | "account_number"
  | "check_deposits"
  | "transfers"
  | "promotions"
  | "google_workspace"
  | "documentation"
  | "reimbursements"
  | "unrestricted_disbursements"
  | "front_disbursements";

export interface Plan {
  name: string;
  fee_percentage: number;
  features: PlanFeature[];
}

export default interface Organization extends HcbApiObject<"org"> {
  name: string;
  country: string;
  slug: string;
  icon?: string;
  background_image?: string;
  donation_page_available: boolean;
  playground_mode: boolean;
  playground_mode_meeting_requested: boolean;
  transparent: boolean;
  fee_percentage: number;
  category?:
    | "hackathon"
    | "hack_club"
    | "nonprofit"
    | "event"
    | "high_school_hackathon"
    | "robotics_team"
    | "hardware_grant"
    | "hack_club_hq"
    | "outernet_guild"
    | "grant_recipient"
    | "salary";
  plan?: Plan;
}

export interface OrganizationExpanded extends Organization {
  balance_cents: number;
  fee_balance_cents: number;
  users: OrgUser[];
  account_number?: string;
  routing_number?: string;
  swift_bic_code?: string;
}
