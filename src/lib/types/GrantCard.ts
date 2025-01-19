import Card from "./Card";

export default interface GrantCard extends Card {
  grant_id: string;
  card_id: string;
  amount_cents: number;
}
