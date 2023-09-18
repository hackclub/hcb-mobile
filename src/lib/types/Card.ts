import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";

export default interface Card extends HcbApiObject<"crd"> {
  last4?: string;
  type: "virtual" | "physical";
  status: "inactive" | "frozen" | "active" | "canceled";
  name?: string;
  organization: Organization;
}
