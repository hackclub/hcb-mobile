import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const LinkingContext = createContext<{
  enabled: boolean | null;
  setEnabled: (val: boolean) => void;
}>({
  enabled: null,
  setEnabled: () => {},
});

export const LinkingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const val = await AsyncStorage.getItem("linking-enabled");
      setEnabled(val !== "false");
    };
    load();
  }, []);

  useEffect(() => {
    if (enabled !== null) {
      AsyncStorage.setItem("linking-enabled", enabled ? "true" : "false");
    }
  }, [enabled]);

  return (
    <LinkingContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </LinkingContext.Provider>
  );
};

export const useLinkingPref = () => useContext(LinkingContext);
