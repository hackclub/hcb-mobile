import HcbApiObject from "./HcbApiObject";
import User from "./User";

export default interface Comment extends HcbApiObject<"cmt"> {
  content: string;
  user: User;
  admin_only?: boolean;
  file?: string;
}
