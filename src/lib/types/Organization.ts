import HcbApiObject from "./HcbApiObject";

export default interface Organization extends HcbApiObject<"org"> {
  name: string;
  country: string;
  slug: string;
  icon?: string;
  playground_mode: boolean;
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
}
