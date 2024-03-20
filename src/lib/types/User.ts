import HcbApiObject from "./HcbApiObject";

export default interface User extends Omit<HcbApiObject<"usr">, "created_at"> {
  name: string;
  email: string;
  avatar?: string;
  admin: boolean;
}

export interface OrgUser extends User {
  joined_at: string;
  role?: "member" | "manager";
}
