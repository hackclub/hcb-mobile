import { useTheme } from "@react-navigation/native";
import {
  AddToWalletButton,
  GooglePayCardToken,
} from "@stripe/stripe-react-native";
import { Image } from "expo-image";
import { Modal, View, Text } from "react-native";

import { useIsDark } from "../../../lib/useColorScheme";
import Button from "../../Button";

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
  ableToAddToWallet: boolean;
  cardAddedToWallet: boolean;
  androidCardToken: GooglePayCardToken | null;
  ephemeralKey: {
    id: string;
    object: string;
    created: number;
    expires: number;
    livemode: boolean;
    secret: string;
    associated_objects: unknown[];
  } | null;
  walletCard: {
    cardholder?: { name?: string };
    wallets?: { primary_account_identifier?: string };
    last4?: string;
  } | null;
  user: { name?: string } | null;
  cardStatus: string | null;
  onComplete: (result: { error: unknown }) => void;
}

export default function WalletModal({
  visible,
  onClose,
  ableToAddToWallet,
  cardAddedToWallet,
  androidCardToken,
  ephemeralKey,
  walletCard,
  user,
  cardStatus,
  onComplete,
}: WalletModalProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 15,
            padding: 20,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: themeColors.text,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Add to Google Wallet
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              marginBottom: 20,
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            Add your card to Google Wallet for easy payments and quick access.
          </Text>

          {cardStatus === "CARD_ALREADY_EXISTS" && androidCardToken == null && (
            <View style={{ alignItems: "center" }}>
              <Image
                source={
                  isDark
                    ? require("../../../../assets/gwallet-added-white.png")
                    : require("../../../../assets/gwallet-added-black.png")
                }
                style={{
                  aspectRatio: 1449 / 326,
                  width: "90%",
                  marginBottom: 20,
                }}
              />
            </View>
          )}
          {((ableToAddToWallet && !cardAddedToWallet) || androidCardToken) &&
            ephemeralKey && walletCard && (
              <AddToWalletButton
                {...(androidCardToken ? { token: androidCardToken } : {})}
                androidAssetSource={require("../../../../assets/google-wallet.png")}
                style={{
                  alignSelf: "center",
                  width: "70%",
                  aspectRatio: 199 / 55,
                  marginBottom: 20,
                }}
                cardDetails={{
                  name: walletCard?.cardholder?.name || user?.name || "",
                  primaryAccountIdentifier:
                    walletCard?.wallets?.primary_account_identifier || null,
                  lastFour: walletCard?.last4,
                  description: "HCB Card",
                }}
                ephemeralKey={ephemeralKey}
                onComplete={onComplete}
              />
            )}

          <Button
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.05)",
            }}
            color={themeColors.text}
            onPress={onClose}
          >
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}
