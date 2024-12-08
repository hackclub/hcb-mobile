import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export default interface Card extends HcbApiObject<"crd"> {
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  type: "virtual" | "physical";
  status: "inactive" | "frozen" | "active" | "canceled";
  name?: string;
  organization: Organization;
  total_spent_cents?: number;
  user: User;
}
