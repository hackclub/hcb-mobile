import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export default interface Invitation extends HcbApiObject<"ivt"> {
  sender?: User; // Field is optional for future-proofing reasons
  accepted: boolean;
  organization: Organization;
}
