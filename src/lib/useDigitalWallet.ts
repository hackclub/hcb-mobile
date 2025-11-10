import {
  canAddCardToWallet,
  Constants,
  GooglePayCardToken,
} from "@stripe/stripe-react-native";
import ky from "ky";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import useClient from "../lib/client";

interface StripeCard {
  id: string;
  last4: string;
  cardholder?: {
    name: string;
  };
  wallets?: {
    primary_account_identifier?: string;
    token?: GooglePayCardToken;
  };
}

export interface DigitalWalletState {
  canAddToWallet: boolean;
  androidCardToken: GooglePayCardToken | null;
  status: string | null;
  error: string | null;
}

export default function useDigitalWallet(cardId: string, isPhysical: boolean) {
  const hcb = useClient();
  const [state, setState] = useState<DigitalWalletState>({
    canAddToWallet: false,
    status: null,
    androidCardToken: null,
    error: null,
  });
  const [ephemeralKey, setEphemeralKey] = useState<{
    ephemeralKeyExpires: number;
    ephemeralKeyCreated: number;
    ephemeralKeyId: string;
    ephemeralKeySecret: string;
    stripe_id: string;
  } | null>(null);
  const [card, setCard] = useState<StripeCard | null>(null);
  const [isPaired, setIsPaired] = useState(false);

  const fetchCardDetails = useCallback(async () => {
    try {
      // Fetch ephemeral key

      const ephemeralKeyResponse = await hcb(
        `cards/${cardId}/ephemeral_keys?stripe_version=${Platform.OS === "ios" ? Constants.API_VERSIONS.ISSUING : "2020-08-27"}`,
      ).json<{
        ephemeralKeyId: string;
        ephemeralKeySecret: string;
        stripe_id: string;
        ephemeralKeyExpires: number;
        ephemeralKeyCreated: number;
      }>();
      setEphemeralKey(ephemeralKeyResponse);
      if (!ephemeralKeyResponse) {
        throw new Error("Failed to get ephemeral key");
      }

      // Fetch card details using the ephemeral key
      const cardData = await ky(
        `https://api.stripe.com/v1/issuing/cards/${ephemeralKeyResponse.stripe_id}`,
        {
          headers: {
            Authorization: `Bearer ${ephemeralKeyResponse.ephemeralKeySecret}`,
            "Stripe-Version":
              Platform.OS === "ios"
                ? Constants.API_VERSIONS.ISSUING
                : "2020-08-27",
          },
        },
      ).json<StripeCard>();

      setCard(cardData);

      const {
        canAddCard,
        details: walletDetails,
        error: walletError,
      } = await canAddCardToWallet({
        primaryAccountIdentifier:
          cardData.wallets?.primary_account_identifier || null,
        cardLastFour: cardData.last4,
        hasPairedAppleWatch: isPaired || false,
      });

      if (walletError) {
        setState((prev) => ({ ...prev, error: walletError.message }));
      } else {
        setState({
          canAddToWallet: canAddCard,
          status: walletDetails?.status || null,
          androidCardToken:
            walletDetails?.token?.status ===
            "TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION"
              ? walletDetails.token
              : null,
          error: null,
        });
      }
    } catch (err) {
      console.error("Error in fetchCardDetails:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "An error occurred",
      }));
    }
  }, [cardId, hcb, isPaired]);

  useEffect(() => {
    if (Platform.OS === "ios") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getIsPaired } = require("react-native-watch-connectivity");
        getIsPaired().then((isPaired: boolean) => {
          setIsPaired(isPaired);
        });
      } catch (e) {
        setIsPaired(false);
      }
    } else {
      setIsPaired(false);
    }
  }, []);

  useEffect(() => {
    if (isPhysical) {
      setState({
        canAddToWallet: false,
        status: null,
        androidCardToken: null,
        error: null,
      });
    } else {
      fetchCardDetails();
    }
  }, [fetchCardDetails]);

  return {
    ...state,
    refresh: isPhysical ? () => {} : fetchCardDetails,
    ephemeralKey: ephemeralKey
      ? {
          id: ephemeralKey.ephemeralKeyId,
          object: "ephemeral_key",
          associated_objects: [
            {
              id: ephemeralKey.stripe_id,
              type: "issuing.card",
            },
          ],
          created: ephemeralKey.ephemeralKeyCreated,
          expires: ephemeralKey.ephemeralKeyExpires,
          livemode: true,
          secret: ephemeralKey.ephemeralKeySecret,
        }
      : null,
    card,
  };
}
