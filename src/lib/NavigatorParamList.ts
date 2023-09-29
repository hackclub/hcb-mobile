import Invitation from "./types/Invitation";
import Organization from "./types/Organization";

export type StackParamList = {
  Organizations: undefined;
  Invitation: { invitation: Invitation };
  Event: { organization: Organization };
  Transaction: { orgId: string; transactionId: string };
};

export type CardsStackParamList = {
  CardList: undefined;
  Card: { cardId: string; last4: string };
};

export type ReceiptsStackParamList = {
  MissingReceiptList: undefined;
};

export type TabParamList = {
  Home: undefined;
  Cards: undefined;
  Receipts: undefined;
  Settings: undefined;
};
