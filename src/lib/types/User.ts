import HcbApiObject from "./HcbApiObject";

export default interface User extends Omit<HcbApiObject<"usr">, "created_at"> {
  name: string;
  email: string;
  avatar?: string;
  admin: boolean;
  auditor: boolean;
  birthday?: string;
  shipping_address: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }
}

export interface OrgUser extends User {
  joined_at: string;
  role?: "member" | "manager";
}
