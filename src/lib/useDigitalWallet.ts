import { canAddCardToWallet, GooglePayCardToken } from '@stripe/stripe-react-native';
import ky from 'ky';
import { useEffect, useState } from 'react';

import useClient from './client';

interface StripeCard {
  id: string;
  last4: string;
  wallets?: {
    primary_account_identifier?: string;
  };
}

interface WalletDetails {
  token?: GooglePayCardToken;
  status?: string;
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
    ephemeralKeyId: string;
    ephemeralKeySecret: string;
    stripe_id: string;
  } | null>(null);
  const [card, setCard] = useState<StripeCard | null>(null);
  const [details, setDetails] = useState<WalletDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchCardDetails();
  }, [cardId]);

  const fetchCardDetails = async () => {
    try {
      // Fetch ephemeral key
      const { private_nonce, public_nonce } = await ky
        .post('https://api.stripe.com/v1/ephemeral_key_nonces', {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_STRIPE_API_KEY}`,
          },
        })
        .json<{ private_nonce: string; public_nonce: string }>();

      const ephemeralKeyResponse = await hcb(
        `cards/${cardId}/ephemeral_keys?nonce=${public_nonce}`,
      ).json<{ ephemeralKeyId: string; ephemeralKeySecret: string; stripe_id: string }>();

      if (!ephemeralKeyResponse) {
        throw new Error('Failed to get ephemeral key');
      }

      setEphemeralKey(ephemeralKeyResponse);

      // Fetch card details using the ephemeral key
      const cardData = await ky(
        `https://api.stripe.com/v1/issuing/cards/${ephemeralKeyResponse.stripe_id}`,
        {
          searchParams: {
            "expand[0]": "number",
            "expand[1]": "cvc",
            ephemeral_key_private_nonce: private_nonce,
          },
          headers: {
            Authorization: `Bearer ${ephemeralKeyResponse.ephemeralKeySecret}`,
            "Stripe-Version": "2020-03-02",
          },
        },
      ).json<StripeCard>();

      setCard(cardData);

      // Check if card can be added to wallet
      const { canAddCard, details: walletDetails, error: walletError } = await canAddCardToWallet({
        primaryAccountIdentifier: cardData?.wallets?.primary_account_identifier ?? null,
        cardLastFour: cardData.last4,
      });

      console.log(canAddCard, walletDetails, walletError);
      setDetails(walletDetails ?? null);
      setError(walletError?.message ?? null);

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
      id: ephemeralKey.ephemeralKeyId,
      object: "ephemeral_key",
      associated_objects: [
        {
          id: ephemeralKey.stripe_id,
          type: "issuing.card"
        }
      ],
      livemode: true,
      created: 1586556828,
      expires: 1586560428,
      secret: ephemeralKey.ephemeralKeySecret
    } : null,
    card,
    error,
    details,
  };
} 