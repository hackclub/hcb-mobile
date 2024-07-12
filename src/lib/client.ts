import ky from "ky";
import { useContext, useMemo } from "react";

import AuthContext from "../auth";

export default function useClient(token?: string | null | undefined) {
  const { token: _token } = useContext(AuthContext);

  return useMemo(
    () =>
      ky.create({
        prefixUrl: process.env.EXPO_PUBLIC_API_BASE,
        headers: {
          Authorization: `Bearer ${token || _token}`,
          "User-Agent": "HCB-Mobile",
        },
      }),
    [token, _token],
  );
}
