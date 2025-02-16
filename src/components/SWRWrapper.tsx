import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system";
import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import {
  AppState,
  AppStateStatus,
  InteractionManager,
  Platform,
} from "react-native";
import "react-native-gesture-handler";
import { SWRConfig } from "swr";
import { useIsConnected } from 'react-native-offline';

async function fileSystemProvider(cacheData: Map<unknown, unknown> | null) {


  InteractionManager.runAfterInteractions(async () => {
    const cacheDir = FileSystem.cacheDirectory + "hcb-mobile-cache/";
    const file = `${cacheDir}cache.json`;

    async function ensureDirExists() {
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }
    }

    const map = cacheData || new Map();
    if (map.size === 0) {
      console.log("⛔ Cache is empty, not saving to disk.");
      return;
    }

    await ensureDirExists();
    try {
      await FileSystem.writeAsStringAsync(file, JSON.stringify([...map]));
      console.log(`💾 Saved ${map.size} API routes to cache.`);
    } catch (error) {
      console.error("❌ Failed to save cache:", error);
    }
  });
}

interface SWRWrapperProps {
  fetcher: (url: string, options: RequestInit) => Promise<unknown>;
  children: ReactNode;
}

export function SWRWrapper({ fetcher, children }: SWRWrapperProps) {
  const cacheData = useRef(new Map());
  const lastSaveTime = useRef(Date.now());
  const [cacheLoaded, setCacheLoaded] = useState(Platform.OS === "web");
  const isConnected = useIsConnected();

  // Periodic cache saving
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("📶 Network state:", isConnected);
      if (!isConnected) {
        console.log("📴 Offline - Skipping cache save");
        return;
      }
      if (cacheData.current && Date.now() - lastSaveTime.current >= 10000) {
        fileSystemProvider(cacheData.current);
        lastSaveTime.current = Date.now();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Handle app state changes
  useEffect(() => {
    const saveCache = () => {
      if (cacheData.current) {
        fileSystemProvider(cacheData.current);
        lastSaveTime.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener("change", saveCache);

    return () => {
      subscription.remove();
    };
  }, []);

  // Load cache from file system
  useEffect(() => {
    (async () => {
      if (cacheLoaded) return;

      const cacheDir = FileSystem.cacheDirectory + "hcb-mobile-cache/";
      const file = `${cacheDir}cache.json`;

      try {
        const fileInfo = await FileSystem.getInfoAsync(file);
        if (fileInfo.exists) {
          console.log("📂 Cache file found, restoring cache...");
          const data = await FileSystem.readAsStringAsync(file);
          cacheData.current = new Map(JSON.parse(data));
          console.log(`📂 Restored ${cacheData.current.size} API routes.`);
        } else {
          console.log("📂 No cache file found, initializing empty cache.");
          cacheData.current = new Map();
        }
      } catch (error) {
        console.error("❌ Error loading cache:", error);
        cacheData.current = new Map();
      }

      if (!cacheLoaded) setCacheLoaded(true);
    })();
  }, [cacheLoaded]);

  const contextValue = useMemo(
    () => ({
      provider: () => cacheData.current,
      isVisible: () => true,
      fetcher,
      initFocus(callback: () => void) {
        let appState: AppStateStatus = AppState.currentState as AppStateStatus;

        const onAppStateChange = (nextAppState: AppStateStatus) => {
          if (
            appState.match(/inactive|background/) &&
            nextAppState === "active"
          ) {
            callback();
          }
          appState = nextAppState;
        };

        const subscription = AppState.addEventListener(
          "change",
          onAppStateChange,
        );

        return () => {
          subscription.remove();
        };
      },
    }),
    [fetcher],
  );

  return cacheLoaded ? (
    <SWRConfig value={contextValue}>{children}</SWRConfig>
  ) : null;
}
