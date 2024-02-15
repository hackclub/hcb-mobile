import { NavigatorScreenParams } from "@react-navigation/native";

import Card from "./types/Card";
import Invitation from "./types/Invitation";
import Organization from "./types/Organization";
import Transaction from "./types/Transaction";

export type StackParamList = {
  Organizations: undefined;
  Invitation: { inviteId: Invitation["id"]; invitation?: Invitation };
  Event: { orgId: Organization["id"]; organization?: Organization };
  Transaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
  };
  RenameTransaction: { orgId: string; transaction: Transaction };
};

export type CardsStackParamList = {
  CardList: undefined;
  Card: { card: Card };
  Transaction: { orgId: string; transaction: Transaction };
  RenameTransaction: { orgId: string; transaction: Transaction };
};

export type ReceiptsStackParamList = {
  MissingReceiptList: undefined;
};

export type TabParamList = {
  Home: NavigatorScreenParams<StackParamList>;
  Cards: NavigatorScreenParams<CardsStackParamList>;
  Receipts: undefined;
  Settings: undefined;
};
