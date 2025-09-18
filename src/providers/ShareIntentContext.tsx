import { useShareIntentContext as useExpoShareIntentContext } from "expo-share-intent";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import useSWR from "swr";

import AuthContext from "../auth/auth";
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
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const { tokens } = useContext(AuthContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTriggered = useRef<boolean>(false);

  // Fetch missing receipt data only when authenticated and has pending images
  const { data: missingReceiptData, error: missingReceiptError } = useSWR<{
    data: (Transaction & { organization: Organization })[];
  }>(
    tokens?.accessToken && pendingImages.length > 0
      ? "user/transactions/missing_receipt"
      : null,
  );

  // Add timeout to show modal if missing receipt data takes too long
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingImages.length > 0 && tokens?.accessToken) {
      const imagesToProcess = [...pendingImages]; // Capture current images
      timeoutRef.current = setTimeout(() => {
        setPendingShareIntent((current) => {
          if (current === null) {
            return {
              images: imagesToProcess,
              missingTransactions: [],
            };
          }
          return current;
        });
        setPendingImages([]);
      }, 5000); // 5 second timeout
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pendingImages, tokens?.accessToken]);

  useEffect(() => {
    if (hasShareIntent && shareIntent && !shareIntentProcessed) {
      const imageUrls =
        (shareIntent as { files?: Array<{ path: string }> }).files?.map(
          (file) => file.path,
        ) || [];

      if (imageUrls.length > 0) {
        if (tokens?.accessToken) {
          // User is already authenticated, fetch missing receipt data
          setPendingImages(imageUrls);
        } else {
          // User is not authenticated, store images for later
          setPendingImages(imageUrls);
          setShareIntentProcessed(true);
          resetShareIntent();
        }
      }
    }
  }, [
    hasShareIntent,
    shareIntent,
    shareIntentProcessed,
    resetShareIntent,
    tokens?.accessToken,
  ]);

  // Handle missing receipt data when it loads
  useEffect(() => {
    if (pendingImages.length > 0 && tokens?.accessToken) {
      if (missingReceiptData?.data && missingReceiptData.data.length > 0) {
        setPendingShareIntent({
          images: pendingImages,
          missingTransactions: missingReceiptData.data,
        });
        setPendingImages([]);
      } else if (missingReceiptError) {
        setPendingShareIntent({
          images: pendingImages,
          missingTransactions: [],
        });
        setPendingImages([]);
      } else if (!missingReceiptData && !missingReceiptError) {
        // Still loading, wait
      } else {
        // No missing receipts, show modal for receipt bin upload
        setPendingShareIntent({
          images: pendingImages,
          missingTransactions: [],
        });
        setPendingImages([]);
      }
    }
  }, [
    pendingImages,
    missingReceiptData,
    missingReceiptError,
    tokens?.accessToken,
  ]);

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
