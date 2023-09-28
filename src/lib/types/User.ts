import HcbApiObject from "./HcbApiObject";

export default interface User extends Omit<HcbApiObject<"usr">, "created_at"> {
  name: string;
  email: string;
  avatar?: string;
  admin: boolean;
}
