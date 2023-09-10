import { createContext } from "react";

const AuthContext = createContext<{
  token?: string | null;
  setToken?: React.Dispatch<string>;
}>({});

export default AuthContext;
