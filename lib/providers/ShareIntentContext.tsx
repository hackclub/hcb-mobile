import { useShareIntentContext as useExpoShareIntentContext } from "expo-share-intent";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import Organization from "../lib/types/Organization";
import Transaction from "../lib/types/Transaction";

interface ShareIntentData {
  images: string[];
  missingTransactions: (Transaction & { organization: Organization })[];
}

interface ShareIntentContextType {
  pendingShareIntent: ShareIntentData | null;
  clearPendingShareIntent: () => void;
  hasPendingShareIntent: boolean;
}

const ShareIntentContext = createContext<ShareIntentContextType | undefined>(
  undefined,
);

export function ShareIntentProvider({ children }: { children: ReactNode }) {
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useExpoShareIntentContext();
  const [pendingShareIntent, setPendingShareIntent] =
    useState<ShareIntentData | null>(null);
  const [shareIntentProcessed, setShareIntentProcessed] = useState(false);

  useEffect(() => {
    if (hasShareIntent && shareIntent && !shareIntentProcessed) {
      const imageUrls =
        (shareIntent as { files?: Array<{ path: string }> }).files?.map(
          (file) => file.path,
        ) || [];

      if (imageUrls.length > 0) {
        setPendingShareIntent({
          images: imageUrls,
          missingTransactions: [],
        });
        setShareIntentProcessed(true);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, shareIntentProcessed, resetShareIntent]);

  // Reset share intent processed flag when share intent changes
  useEffect(() => {
    if (hasShareIntent) {
      setShareIntentProcessed(false);
    }
  }, [hasShareIntent]);

  const clearPendingShareIntent = () => {
    setPendingShareIntent(null);
  };

  return (
    <ShareIntentContext.Provider
      value={{
        pendingShareIntent,
        clearPendingShareIntent,
        hasPendingShareIntent: pendingShareIntent !== null,
      }}
    >
      {children}
    </ShareIntentContext.Provider>
  );
}

export function useShareIntentContext() {
  const context = useContext(ShareIntentContext);
  if (context === undefined) {
    throw new Error(
      "useShareIntentContext must be used within a ShareIntentProvider",
    );
  }
  return context;
}
