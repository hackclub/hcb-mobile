import Card from "./types/Card";
import Invitation from "./types/Invitation";
import Organization from "./types/Organization";
import Transaction from "./types/Transaction";

export type StackParamList = {
  Organizations: undefined;
  Invitation: { invitation: Invitation };
  Event: { organization: Organization };
  Transaction: { orgId: string; transaction: Transaction };
  RenameTransaction: { orgId: string; transaction: Transaction };
};

export type CardsStackParamList = {
  CardList: undefined;
  Card: { card: Card };
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
