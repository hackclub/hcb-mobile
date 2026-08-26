import HcbApiObject from "./HcbApiObject";
import User from "./User";

export type OrganizerPositionRole = "reader" | "member" | "manager";

export default interface OrganizerPosition extends HcbApiObject<"opn"> {
  role: OrganizerPositionRole;
  signee: boolean;
  user: User;
}
