export default interface Card {
  created_at: string;
  id: string;
  last4?: string;
  type: "virtual" | "physical";
  status: "inactive" | "frozen" | "active" | "canceled";
  name?: string;
}
