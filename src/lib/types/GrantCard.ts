import Card from "./Card";

export default interface GrantCard extends Card {
  grant_id: string;
  card_id: string;
  amount_cents: number;
  one_time_use: boolean;
  purpose: string;
  allowed_merchants: string[];
  allowed_categories: string[];
  balance_cents: number;
}
