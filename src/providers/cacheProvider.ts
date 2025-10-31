import { File, Directory, Paths } from "expo-file-system";
import { useEffect } from "react";
import { AppState, InteractionManager } from "react-native";
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
    const appCacheDir = new Directory(Paths.cache, "app-cache");
    this.cacheDir = appCacheDir.uri;
    this.cacheFile = new File(appCacheDir, "cache.json").uri;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.ensureCacheDirectory();
      const cacheFile = new File(Paths.cache, "app-cache", "cache.json");
      if (await cacheFile.exists) {
        const data = await cacheFile.text();
        const entries = JSON.parse(data);
        entries.forEach(([key, value]: [string, State<CacheValue, Error>]) => {
          this.map.set(key, value);
        });
      }
      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing cache", error, {
        context: { cacheSize: this.map.size },
      });
    }
  }

  private async ensureCacheDirectory() {
    try {
      const cacheDir = new Directory(Paths.cache, "app-cache");
      if (!(await cacheDir.exists)) {
        await cacheDir.create();
      }
    } catch (error) {
      console.error("Error ensuring cache directory", error, {
        context: { cacheDir: this.cacheDir },
      });
      throw error; // Re-throw as this is critical for cache functionality
    }
  }

  async save() {
    if (this.map.size === 0) return;

    try {
      await this.ensureCacheDirectory();
      const cacheFile = new File(Paths.cache, "app-cache", "cache.json");
      await cacheFile.write(JSON.stringify(Array.from(this.map.entries())));
    } catch (error) {
      console.error("Error saving cache", error, {
        context: { cacheSize: this.map.size },
      });
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
(async () => {
  await cacheProvider.initialize();
})();

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
