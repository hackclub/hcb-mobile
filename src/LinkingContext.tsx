import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LinkingContext = createContext<{
  enabled: boolean;
  setEnabled: (val: boolean) => void;
}>({
  enabled: true,
  setEnabled: () => {},
});

export const LinkingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      const val = await AsyncStorage.getItem("linking-enabled");
      setEnabled(val !== "false");
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("linking-enabled", enabled ? "true" : "false");
  }, [enabled]);

  return (
    <LinkingContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </LinkingContext.Provider>
  );
};

export const useLinkingPref = () => useContext(LinkingContext);
