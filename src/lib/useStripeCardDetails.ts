import ky from "ky";
import { useEffect, useState } from "react";

import useClient from "./client";

export interface CardDetails {
  number: string;
  cvc: string;
  exp_month: number;
  exp_year: number;
}

export default function useStripeCardDetails(cardId: string) {
  const hcb = useClient();
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<CardDetails | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (revealed) {
        try {
          setLoading(true);

          const { private_nonce, public_nonce } = await ky
            .post("https://api.stripe.com/v1/ephemeral_key_nonces", {
              headers: {
                Authorization: `Bearer ${process.env.EXPO_PUBLIC_STRIPE_API_KEY}`,
              },
            })
            .json<{ private_nonce: string; public_nonce: string }>();

          const { ephemeralKeySecret, stripe_id: stripeId } = await hcb(
            `cards/${cardId}/ephemeral_keys?nonce=${public_nonce}`,
          ).json<{ ephemeralKeySecret: string; stripe_id: string }>();

          console.log(stripeId)

          const { number, cvc, exp_month, exp_year } = await ky(
            `https://api.stripe.com/v1/issuing/cards/${stripeId}`,
            {
              searchParams: {
                "expand[0]": "number",
                "expand[1]": "cvc",
                ephemeral_key_private_nonce: private_nonce,
              },
              headers: {
                Authorization: `Bearer ${ephemeralKeySecret}`,
                "Stripe-Version": "2020-03-02",
              },
            },
          ).json<CardDetails>();

          setDetails({ cvc, number, exp_month, exp_year });
        } finally {
          setLoading(false);
        }
      } else {
        setDetails(undefined);
      }
    })();
  }, [revealed, cardId, setDetails, hcb]);

  return {
    details,
    revealed,
    loading,
    toggle: () => setRevealed(!revealed),
  };
}
