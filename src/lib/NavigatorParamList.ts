import { NavigatorScreenParams } from "@react-navigation/native";

import Card from "./types/Card";
import Invitation from "./types/Invitation";
import Organization, { OrganizationExpanded } from "./types/Organization";
import Transaction from "./types/Transaction";

export type StackParamList = {
  Organizations: undefined;
  Invitation: { inviteId: Invitation["id"]; invitation?: Invitation };
  Event: {
    orgId: Organization["id"];
    organization?: Organization | OrganizationExpanded;
  };
  AccountNumber: {
    orgId: Organization["id"];
    organization?: OrganizationExpanded;
  };
  ProcessDonation: {
    orgId: Organization["id"];
    payment: { amount: number };
    collectPayment: () => Promise<boolean>;
    name: string;
    email: string;
    slug: string;
  };
  OrganizationTeam: { orgId: Organization["id"] };
  OrganizationDonation: { orgId: Organization["id"] };
  Transaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
    title?: string;
    attachReceipt?: boolean;
  };
  RenameTransaction: { orgId: string; transaction: Transaction };
  Transfer: { organization: Organization };
  GrantCard: { grantId: string };
  ShareIntentModal: {
    images: string[];
    missingTransactions: (Transaction & { organization: Organization })[];
  };
};

export type CardsStackParamList = {
  CardList: undefined;
  Card: { card?: Card; cardId?: string; grantId?: string };
  GrantCard: { grantId: string };
  OrderCard: undefined;
  Transaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
    title?: string;
  };
  RenameTransaction: { orgId: string; transaction: Transaction };
};

export type ReceiptsStackParamList = {
  MissingReceiptList: undefined;
  ReceiptSelectionModal: {
    transaction: Transaction & { organization: Organization };
  };
  ReceiptTransaction: {
    transactionId: Transaction["id"];
    orgId?: Organization["id"];
    transaction?: Transaction;
    title?: string;
  };
};

export type TabParamList = {
  Home: NavigatorScreenParams<StackParamList>;
  Cards: NavigatorScreenParams<CardsStackParamList>;
  Receipts: NavigatorScreenParams<ReceiptsStackParamList>;
  Settings: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  AppIconSelector: undefined;
  DeepLinkingSettings: undefined;
  Tutorials: undefined;
  About: undefined;
};
