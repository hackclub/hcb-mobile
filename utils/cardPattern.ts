import { generate } from "hcb-geo-pattern";
import { useEffect, useReducer } from "react";

import Card from "@/lib/types/Card";
import { normalizeSvg } from "@/utils/format";

export interface CardPattern {
  pattern: string;
  dimensions: { width: number; height: number };
}

type PatternInput = Pick<Card, "id" | "status">;

const patterns = new Map<string, CardPattern>();
const inFlight = new Map<string, Promise<CardPattern | null>>();

function grayScaleFor(status: Card["status"]): number {
  if (status === "active") return 0;
  return status === "frozen" ? 0.23 : 1;
}

function patternKey(card: PatternInput): string {
  return `${card.id}:${grayScaleFor(card.status)}`;
}

export function getCardPattern(
  card: PatternInput | undefined | null,
): CardPattern | undefined {
  return card ? patterns.get(patternKey(card)) : undefined;
}

export function ensureCardPattern(
  card: PatternInput,
): Promise<CardPattern | null> {
  const key = patternKey(card);

  const cached = patterns.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = generate({
    input: card.id,
    grayScale: grayScaleFor(card.status),
  })
    .then((data) => {
      const value: CardPattern = {
        pattern: normalizeSvg(data.toSVG(), data.width, data.height),
        dimensions: { width: data.width, height: data.height },
      };
      patterns.set(key, value);
      return value;
    })
    .catch((error) => {
      console.error("Error generating pattern for card", error, {
        context: { cardId: card.id },
      });
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function useCardPattern(
  card: PatternInput | undefined | null,
  enabled: boolean = true,
): CardPattern | undefined {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const key = card && enabled ? patternKey(card) : null;

  useEffect(() => {
    if (!card || !key || patterns.has(key)) return;

    let active = true;
    ensureCardPattern(card).then(() => {
      if (active) bump();
    });

    return () => {
      active = false;
    };
  }, [card, key, bump]);

  return key ? patterns.get(key) : undefined;
}
