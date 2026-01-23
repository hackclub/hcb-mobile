import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import useSWR from "swr";

import User from "../types/User";

interface DevToolsContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  forceOpen: () => void;
}

const DevToolsContext = createContext<DevToolsContextType | null>(null);

export function DevToolsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: user } = useSWR<User>("user");

  const isAuditor = user?.auditor === true;

  const open = useCallback(() => {
    if (isAuditor) {
      setIsOpen(true);
    }
  }, [isAuditor]);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    if (isAuditor) {
      setIsOpen((prev) => !prev);
    }
  }, [isAuditor]);

  const forceOpen = useCallback(() => {
    if (__DEV__) {
      setIsOpen(true);
    }
  }, []);

  return (
    <DevToolsContext.Provider
      value={{ isOpen, open, close, toggle, forceOpen }}
    >
      {children}
    </DevToolsContext.Provider>
  );
}

export function useDevTools() {
  const context = useContext(DevToolsContext);
  if (!context) {
    throw new Error("useDevTools must be used within DevToolsProvider");
  }
  return context;
}
