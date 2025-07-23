import { Merchant } from "@thedev132/yellowpages";
import { useEffect, useState } from "react";

import { logError } from "./errorUtils";

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
const iconCache = new Map<string, string | undefined>();

async function initializeMerchant() {
  if (isInitialized) return;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    try {
      await Merchant.initialize();
      isInitialized = true;
    } catch (error) {
      logError("Error initializing merchant library", error, {
        context: { library: "Merchant" },
      });
      isInitialized = true;
    }
  })();

  await initializationPromise;
}

export function useMerchantIcon(networkId: string | undefined): string | undefined {
  const [icon, setIcon] = useState<string | undefined>(() => {
    if (!networkId) return undefined;
    return iconCache.get(networkId);
  });

  useEffect(() => {
    if (!networkId) {
      setIcon(undefined);
      return;
    }

    // Check cache first
    if (iconCache.has(networkId)) {
      setIcon(iconCache.get(networkId));
      return;
    }

    const getMerchantIcon = async () => {
      await initializeMerchant();
      
      if (!isInitialized) {
        iconCache.set(networkId, undefined);
        setIcon(undefined);
        return;
      }

      try {
        const merchant = Merchant.lookup({ networkId });
        const merchantIcon = await merchant.getIcon();
        
        iconCache.set(networkId, merchantIcon);
        setIcon(merchantIcon);
      } catch (error) {
        logError("Error looking up merchant icon", error, {
          context: { networkId },
        });
        iconCache.set(networkId, undefined);
        setIcon(undefined);
      }
    };

    getMerchantIcon();
  }, [networkId]);

  return icon;
} 