import * as FileSystem from "expo-file-system";
import { useEffect } from "react";
import { AppState, InteractionManager, Platform } from "react-native";
import { Cache, State } from "swr";
import { useDebouncedCallback } from "use-debounce";

type CacheValue = unknown;

export class CacheProvider implements Cache<CacheValue> {
  private map: Map<string, State<CacheValue, Error>>;
  private cacheDir: string;
  private cacheFile: string;
  private isInitialized: boolean = false;

  constructor() {
    this.map = new Map();
    this.cacheDir = FileSystem.cacheDirectory + "app-cache/";
    this.cacheFile = `${this.cacheDir}cache.json`;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === "web") {
        const appCache = localStorage.getItem("app-cache");
        if (appCache) {
          JSON.parse(appCache).forEach(
            ([key, value]: [string, State<CacheValue, Error>]) => {
              this.map.set(key, value);
            },
          );
        }
      } else {
        await this.ensureCacheDirectory();
        const fileInfo = await FileSystem.getInfoAsync(this.cacheFile);
        if (fileInfo.exists) {
          const data = await FileSystem.readAsStringAsync(this.cacheFile);
          const entries = JSON.parse(data);
          entries.forEach(
            ([key, value]: [string, State<CacheValue, Error>]) => {
              this.map.set(key, value);
            },
          );
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing cache:", error);
    }
  }

  private async ensureCacheDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, {
        intermediates: true,
      });
    }
  }

  async save() {
    if (this.map.size === 0) return;

    try {
      if (Platform.OS === "web") {
        const appCache = JSON.stringify(Array.from(this.map.entries()));
        localStorage.setItem("app-cache", appCache);
      } else {
        await this.ensureCacheDirectory();
        await FileSystem.writeAsStringAsync(
          this.cacheFile,
          JSON.stringify(Array.from(this.map.entries())),
        );
      }
    } catch (error) {
      console.error("Error saving cache:", error);
    }
  }

  get(key: string): State<CacheValue, Error> | undefined {
    return this.map.get(key);
  }

  set(key: string, value: State<CacheValue, Error>): void {
    this.map.set(key, value);
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  // SWR Cache interface implementation
  keys(): IterableIterator<string> {
    return this.map.keys();
  }
}

// Create a singleton instance
const cacheProvider = new CacheProvider();

// Initialize cache when the app starts
cacheProvider.initialize();

// Set up app state listeners for saving cache
AppState.addEventListener("change", (nextAppState) => {
  if (nextAppState === "background" || nextAppState === "inactive") {
    InteractionManager.runAfterInteractions(() => {
      cacheProvider.save();
    });
  }
});

// Export a hook for using the cache
export function useCache() {
  const saveCache = useDebouncedCallback(() => {
    cacheProvider.save();
  }, 10000);

  // Set up automatic saving
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        saveCache();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [saveCache]);

  return cacheProvider;
}

export default cacheProvider;
