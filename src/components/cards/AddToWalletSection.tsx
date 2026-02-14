import { AddToWalletButton } from "@stripe/stripe-react-native";
import { Platform } from "react-native";

import { useIsDark } from "../../lib/useColorScheme";

import WalletModal from "./modals/WalletModal";

import type User from "../../lib/types/User";
import type { UseAddToWalletReturn } from "../../lib/useAddToWallet";

export interface AddToWalletSectionProps extends UseAddToWalletReturn {
  user: User | undefined;
  cardNotCanceled: boolean;
  description?: string;
}

export default function AddToWalletSection({
  ableToAddToWallet,
  ephemeralKey,
  walletCard,
  androidCardToken,
  cardStatus,
  cardAddedToWallet,
  showWalletModal,
  setShowWalletModal,
  onWalletComplete,
  user,
  cardNotCanceled,
  description = "HCB Card",
}: AddToWalletSectionProps) {
  const isDark = useIsDark();

  return (
    <>
      {ableToAddToWallet &&
        ephemeralKey &&
        Platform.OS === "ios" &&
        cardNotCanceled && (
          <AddToWalletButton
            token={androidCardToken}
            androidAssetSource={require("../../../assets/google-wallet.png")}
            style={{
              height: 48,
              width: "100%",
              marginBottom: 20,
            }}
            iOSButtonStyle={isDark ? "onDarkBackground" : "onLightBackground"}
            cardDetails={{
              name: walletCard?.cardholder?.name || user?.name || "",
              primaryAccountIdentifier:
                walletCard?.wallets?.primary_account_identifier || null,
              lastFour: walletCard?.last4,
              description,
            }}
            ephemeralKey={ephemeralKey}
            onComplete={onWalletComplete}
          />
        )}

      <WalletModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        ableToAddToWallet={ableToAddToWallet}
        cardAddedToWallet={cardAddedToWallet}
        androidCardToken={androidCardToken}
        ephemeralKey={ephemeralKey}
        walletCard={walletCard}
        user={user || null}
        cardStatus={cardStatus}
        onComplete={onWalletComplete}
      />
    </>
  );
}
