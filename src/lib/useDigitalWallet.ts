import { checkWalletAvailability, getCardStatusBySuffix } from '@expensify/react-native-wallet'
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
  const [isPaired, setIsPaired] = useState(false);

  const fetchCardDetails = useCallback(async () => {
    try {
      // Fetch ephemeral key

      const ephemeralKeyResponse = await hcb(
        `cards/${cardId}/ephemeral_keys?stripe_version=${Constants.API_VERSIONS.ISSUING || "2020-08-27"}`,
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
            "Stripe-Version": Constants.API_VERSIONS.ISSUING || "2020-08-27",
          },
        },
      ).json<StripeCard>();

      setCard(cardData);

      console.log('🔍 Card Data:', cardData.last4);
      console.log('🔍 Full Card Data:', JSON.stringify(cardData, null, 2));
      
      // Check wallet eligibility
      console.log('🔍 Wallet Eligibility:');
      console.log('  - Apple Pay eligible:', cardData.wallets?.apple_pay?.eligible);
      console.log('  - Google Pay eligible:', cardData.wallets?.google_pay?.eligible);
      console.log('  - Apple Pay ineligible reason:', cardData.wallets?.apple_pay?.ineligible_reason);
      console.log('  - Google Pay ineligible reason:', cardData.wallets?.google_pay?.ineligible_reason);
      
      const walletAvailability = await checkWalletAvailability();
      console.log('🔍 Check Wallet Availability:', walletAvailability);
      
      // Try different variations of the card suffix
      const cardSuffixes = [
        cardData.last4,
        cardData.last4.toString(),
        String(cardData.last4),
        cardData.last4.toString().padStart(4, '0'),
        // Try with leading zeros if last4 is less than 4 digits
        cardData.last4.toString().padStart(4, '0')
      ];
      
      // Remove duplicates
      const uniqueSuffixes = [...new Set(cardSuffixes)];
      
      console.log('🔍 Testing different card suffixes:', uniqueSuffixes);
      
      let cardStatus = "not found";
      for (const suffix of uniqueSuffixes) {
        try {
          console.log(`🔍 Calling getCardStatusBySuffix with suffix: "${suffix}"`);
          const status = await getCardStatusBySuffix(suffix);
          console.log(`🔍 Card Status for suffix "${suffix}":`, status);
          console.log(`🔍 Status type:`, typeof status);
          console.log(`🔍 Status value:`, JSON.stringify(status));
          if (status !== "not found") {
            cardStatus = status;
            break;
          }
        } catch (error) {
          console.log(`🔍 Error checking suffix "${suffix}":`, error);
        }
      }
      
      console.log('🔍 Final Card Status:', cardStatus);

      // Check if card can be added to wallet
      console.log('🔍 Calling canAddCardToWallet with:');
      console.log('  - primaryAccountIdentifier:', cardData.wallets?.primary_account_identifier);
      console.log('  - cardLastFour:', cardData.last4);
      console.log('  - hasPairedAppleWatch:', isPaired);
      
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
      
      console.log('🔍 canAddCardToWallet response:');
      console.log('  - canAddCard:', canAddCard);
      console.log('  - walletDetails type:', typeof walletDetails);
      console.log('  - walletDetails keys:', walletDetails ? Object.keys(walletDetails) : 'null');
      console.log('  - walletError:', walletError);

      console.log('🔍 Digital Wallet Debug:');
      console.log('  - cardId:', cardId);
      console.log('  - cardData.last4:', cardData.last4);
      console.log('  - primaryAccountIdentifier:', cardData.wallets?.primary_account_identifier);
      console.log('  - canAddCard:', canAddCard);
      console.log('  - walletError:', walletError);
      console.log('  - walletDetails:', JSON.stringify(walletDetails, null, 2));
      console.log('  - isPaired:', isPaired);
      
      // Log the specific status from walletDetails if available
      if (walletDetails?.status) {
        console.log('  - walletDetails.status:', walletDetails.status);
      }

      if (walletError) {
        setState((prev) => ({ ...prev, error: walletError.message }));
      } else {
        // Determine if card can be added based on both functions
        // canAddCard should be true if card can be added
        // cardStatus should be "not found" if card is not already in wallet
        // Also check walletDetails.status for additional status information
        let cardCanBeAdded = canAddCard && cardStatus === "not found";
        
        // If walletDetails has a status, use that to determine if card already exists
        if (walletDetails?.status) {
          const status = walletDetails.status;
          console.log('🔍 Wallet Details Status Analysis:');
          console.log('  - status:', status);
          
          // Check if card already exists based on status
          const cardAlreadyExists = [
            'CARD_ALREADY_EXISTS',
            'CARD_EXISTS_ON_CURRENT_DEVICE', 
            'CARD_EXISTS_ON_PAIRED_DEVICE'
          ].includes(status);
          
          console.log('  - cardAlreadyExists:', cardAlreadyExists);
          
          // If card already exists, it cannot be added
          if (cardAlreadyExists) {
            cardCanBeAdded = false;
            console.log('  - Card already exists, setting canAddToWallet to false');
          }
        } else {
          console.log('🔍 No walletDetails.status found, walletDetails is empty or undefined');
          console.log('🔍 This might indicate the card is not in the wallet or there is an issue with the wallet detection');
          
          // If walletDetails is empty but canAddCard is true, this might mean:
          // 1. The card is not in the wallet (which is what we want)
          // 2. There's an issue with the wallet detection
          // For now, we'll trust the canAddCard result
          console.log('🔍 Trusting canAddCard result:', canAddCard);
          
          // Additional check: if both canAddCard is true and cardStatus is "not found",
          // but the user says the card exists, there might be a detection issue
          if (canAddCard && cardStatus === "not found") {
            console.log('🔍 Potential Issue: canAddCard=true and cardStatus="not found"');
            console.log('🔍 This suggests the card should be addable, but user reports card exists');
            console.log('🔍 This might be a false positive - the card might actually exist');
            
            // In this case, we might want to be more conservative
            // and not allow adding if we're not sure
            console.log('🔍 Consider setting canAddToWallet to false to avoid duplicates');
          }
        }
        
        console.log('🔍 Final Decision:');
        console.log('  - canAddCard:', canAddCard);
        console.log('  - cardStatus:', cardStatus);
        console.log('  - cardCanBeAdded:', cardCanBeAdded);
        console.log('  - walletDetails.status:', walletDetails?.status);
        
        setState({
          canAddToWallet: cardCanBeAdded,
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
    if (Platform.OS === 'ios') {  
      import('react-native-watch-connectivity').then(({ getIsPaired }) => {
        getIsPaired().then((isPaired) => {
          setIsPaired(isPaired);
        });
      });
    } else {
      setIsPaired(false);
    }
  }, []);

  useEffect(() => {
    fetchCardDetails();
  }, [fetchCardDetails]);

  return {
    ...state,
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
