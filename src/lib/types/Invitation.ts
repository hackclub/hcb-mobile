import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export default interface Invitation extends HcbApiObject<"inv"> {
  sender?: User; // Field is optional for future-proofing reasons
  organization: Organization;
}
