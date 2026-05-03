import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export default interface Card extends HcbApiObject<"crd"> {
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  type: "virtual" | "physical";
  status: "inactive" | "frozen" | "active" | "canceled" | "expired";
  name?: string;
  organization: Organization;
  last_frozen_by?: User;
  personalization?: {
    color: "black" | "white";
    logo_url?: string;
  };
  total_spent_cents?: number;
  balance_available?: number;
  user: User;
}
