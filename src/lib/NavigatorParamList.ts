import { NavigatorScreenParams } from "@react-navigation/native";

import Card from "./types/Card";
import Invitation from "./types/Invitation";
import Organization from "./types/Organization";
import Transaction from "./types/Transaction";
import User from "./types/User";

export type StackParamList = {
  Organizations: undefined;
  Invitation: { inviteId: Invitation["id"]; invitation?: Invitation };
  Event: { orgId: Organization["id"]; organization?: Organization };
  AccountNumber: { orgId: Organization["id"] };
  ProcessDonation: {
    orgId: Organization["id"];
    payment: { amount: number };
    collectPayment: () => Promise<boolean>;
    name: string;
    email: string;
  };
  OrganizationSettings: { orgId: Organization["id"] };
  OrganizationDonation: { orgId: Organization["id"] };
  Transaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
  };
  RenameTransaction: { orgId: string; transaction: Transaction };
  Transfer: { organization: Organization };
};

export type CardsStackParamList = {
  CardList: undefined;
  Card: { card: Card };
  OrderCard: { user: User; organizations: string[] };
  Transaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
  };
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
