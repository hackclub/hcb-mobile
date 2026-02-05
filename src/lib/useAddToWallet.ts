import { useEffect, useState } from "react";

import { maybeRequestReview } from "../utils/storeReview";

import useDigitalWallet from "./useDigitalWallet";

export interface UseAddToWalletOptions {
  isVirtualCard: boolean;
  isCardholder: boolean;
}

export interface UseAddToWalletReturn {
  canAddToWallet: boolean;
  ephemeralKey: ReturnType<typeof useDigitalWallet>["ephemeralKey"];
  walletCard: ReturnType<typeof useDigitalWallet>["card"];
  androidCardToken: ReturnType<typeof useDigitalWallet>["androidCardToken"];
  walletStatus: ReturnType<typeof useDigitalWallet>["status"];
  refreshDigitalWallet: ReturnType<typeof useDigitalWallet>["refresh"];
  ableToAddToWallet: boolean;
  setAbleToAddToWallet: (value: boolean) => void;
  cardAddedToWallet: boolean;
  setCardAddedToWallet: (value: boolean) => void;
  cardStatus: string | null;
  setCardStatus: (value: string | null) => void;
  showWalletModal: boolean;
  setShowWalletModal: (value: boolean) => void;
  onWalletComplete: (result: { error: unknown }) => void;
}

export default function useAddToWallet(
  cardId: string,
  options: UseAddToWalletOptions,
): UseAddToWalletReturn {
  const { isVirtualCard, isCardholder } = options;
  const skip =
    !cardId || !isVirtualCard || !isCardholder;

  const {
    canAddToWallet,
    ephemeralKey,
    card: walletCard,
    androidCardToken,
    status: walletStatus,
    refresh: refreshDigitalWallet,
  } = useDigitalWallet(cardId, skip);

  const [ableToAddToWallet, setAbleToAddToWallet] = useState(canAddToWallet);
  const [cardAddedToWallet, setCardAddedToWallet] = useState(false);
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    setCardStatus(walletStatus);
    if (!skip) {
      setAbleToAddToWallet(canAddToWallet);
    }
  }, [canAddToWallet, walletCard, walletStatus, skip]);

  const onWalletComplete = (result: { error: unknown }) => {
    if (result.error) {
      console.error("Error adding card to wallet", result.error);
    } else {
      setCardStatus("CARD_ALREADY_EXISTS");
      setCardAddedToWallet(true);
      setAbleToAddToWallet(false);
      setShowWalletModal(false);
      maybeRequestReview();
    }
  };

  return {
    canAddToWallet,
    ephemeralKey,
    walletCard,
    androidCardToken,
    walletStatus,
    refreshDigitalWallet,
    ableToAddToWallet,
    setAbleToAddToWallet,
    cardAddedToWallet,
    setCardAddedToWallet,
    cardStatus,
    setCardStatus,
    showWalletModal,
    setShowWalletModal,
    onWalletComplete,
  };
}
