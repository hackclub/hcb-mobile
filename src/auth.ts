import { createContext } from "react";

const AuthContext = createContext<{
  token: string | null;
  setToken: React.Dispatch<string>;
}>({ token: null, setToken: () => {} });

export default AuthContext;
