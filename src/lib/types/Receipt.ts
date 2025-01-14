import HcbApiObject from "./HcbApiObject";
import User from "./User";

export default interface Receipt extends HcbApiObject<"rct"> {
  url: string;
  created_at: string;
  preview_url?: string;
  filename: string;
  uploader?: User;
}
