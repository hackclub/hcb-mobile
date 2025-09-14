import { canAddCardToWallet, Constants, GooglePayCardToken } from '@stripe/stripe-react-native';
import ky from 'ky';
import { useEffect, useState } from 'react';

import useClient from '../lib/client';

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
  error: string | null;
}

export default function useDigitalWallet(cardId: string) {
  const hcb = useClient();
  const [state, setState] = useState<DigitalWalletState>({
    canAddToWallet: false,
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
  
  useEffect(() => {
    fetchCardDetails();
  }, [cardId]);

  const fetchCardDetails = async () => {
    try {
      // Fetch ephemeral key


      const ephemeralKeyResponse = await hcb(
        `cards/${cardId}/ephemeral_keys?stripe_version=${Constants.API_VERSIONS.ISSUING}`,
      ).json<{ ephemeralKeyId: string; ephemeralKeySecret: string; stripe_id: string; ephemeralKeyExpires: number; ephemeralKeyCreated: number }>();
      setEphemeralKey(ephemeralKeyResponse);
      if (!ephemeralKeyResponse) {
        throw new Error('Failed to get ephemeral key');
      }

      // Fetch card details using the ephemeral key
      const cardData = await ky(
        `https://api.stripe.com/v1/issuing/cards/${ephemeralKeyResponse.stripe_id}`,
        {
          headers: {
            Authorization: `Bearer ${ephemeralKeyResponse.ephemeralKeySecret}`,
            "Stripe-Version": Constants.API_VERSIONS.ISSUING,
          },
        },
      ).json<StripeCard>();

      setCard(cardData);

      // Check if card can be added to wallet
      const { canAddCard, details: walletDetails, error: walletError } = await canAddCardToWallet({
        primaryAccountIdentifier: cardData?.wallets?.primary_account_identifier ?? null,
        cardLastFour: cardData.last4,
      });

      if (walletError) {
        setState(prev => ({ ...prev, error: walletError.message }));
      } else {
        setState({
          canAddToWallet: canAddCard,
          androidCardToken: walletDetails?.token?.status === 'TOKEN_STATE_NEEDS_IDENTITY_VERIFICATION' ? walletDetails.token : null,
          error: null,
        });
      }
    } catch (err) {
      console.error('Error in fetchCardDetails:', err);
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'An error occurred' }));
    }
  };

  return {
    ...state,
    ephemeralKey: ephemeralKey ? {
      "id": ephemeralKey.ephemeralKeyId,
      "object": "ephemeral_key",
      "associated_objects": [
        {
          "id": ephemeralKey.stripe_id,
          "type": "issuing.card"
        }
      ],
      "created": ephemeralKey.ephemeralKeyCreated,
      "expires": ephemeralKey.ephemeralKeyExpires,
      "livemode": true,
      "secret": ephemeralKey.ephemeralKeySecret
    } : null,
    card,
  };
} 