import HcbApiObject from "./HcbApiObject";
import Organization from "./Organization";
import User from "./User";

export default interface Invitation extends HcbApiObject<"ivt"> {
  sender?: User; // Field is optional for future-proofing reasons
  accepted: boolean;
  // Optional because v4 only embeds associations when the request asks for
  // them via `expand`. Typing this as always-present is what let
  // `InvitationCard` read `org.icon` off `undefined` in production.
  organization?: Organization;
}
