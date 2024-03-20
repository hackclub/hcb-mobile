import HcbApiObject from "./HcbApiObject";
import { OrgUser } from "./User";

export default interface Organization extends HcbApiObject<"org"> {
  name: string;
  country: string;
  slug: string;
  icon?: string;
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
}

export interface OrganizationExpanded extends Organization {
  balance_cents: number;
  fee_balance_cents: number;
  users: OrgUser[];
  account_number?: string;
  routing_number?: string;
  swift_bic_code?: string;
}
