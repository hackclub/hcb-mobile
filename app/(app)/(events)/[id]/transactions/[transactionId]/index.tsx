import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mutate, useSWRConfig } from "swr";
import { match, P } from "ts-pattern";

import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import AdminTools from "@/components/AdminTools";
import TagChip from "@/components/tags/TagChip";
import Comment from "@/components/transaction/Comment";
import CommentField from "@/components/transaction/comment/CommentField";
import TransactionSkeleton from "@/components/transaction/TransactionSkeleton";
import AchTransferTransaction from "@/components/transaction/types/AchTransferTransaction";
import BankAccountTransaction from "@/components/transaction/types/BankAccountTransaction";
import BankFeeTransaction from "@/components/transaction/types/BankFeeTransaction";
import CardChargeTransaction from "@/components/transaction/types/CardChargeTransaction";
import CheckDepositTransaction from "@/components/transaction/types/CheckDepositTransaction";
import CheckTransaction from "@/components/transaction/types/CheckTransaction";
import DonationTransaction from "@/components/transaction/types/DonationTransaction";
import ExpensePayoutTransaction from "@/components/transaction/types/ExpensePayoutTransaction";
import InvoiceTransaction from "@/components/transaction/types/InvoiceTransaction";
import TransferTransaction from "@/components/transaction/types/TransferTransaction";
import WiseTransaction from "@/components/transaction/types/WiseTransaction";
import { shareUrl } from "@/utils/shareUrl";
import { TransactionPolicy } from "@/lib/policies";
import IComment from "@/lib/types/Comment";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import Transaction, { TransactionType } from "@/lib/types/Transaction";
import User from "@/lib/types/User";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

export default function TransactionPage({
  data,
}: {
  data: {
    transactionId: string;
    orgId?: string;
    transaction?: Transaction | string;
  };
}) {
  const navigation = useNavigation();
  const t = useLocalSearchParams<{
    transactionId: string;
    orgId?: string;
    transaction?: string;
  }>();

  const {
    transactionId,
    orgId: _orgId,
    transaction: _transactionParam,
  } = { ...t, ...data };

  const _transaction: Transaction | undefined = _transactionParam
    ? typeof _transactionParam === "string"
      ? JSON.parse(_transactionParam)
      : _transactionParam
    : undefined;

  const orgId = _orgId as string | undefined;

  const [refreshing, setRefreshing] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();
  // filter in case of deeplink with #commentId
  const txnId = transactionId.split("#")[0];

  const { data: transaction, isLoading } = useOfflineSWR<
    Transaction & { organization?: Organization }
  >(
    orgId
      ? `organizations/${orgId}/transactions/${txnId}`
      : `transactions/${txnId}`,
    { fallbackData: _transaction },
  );
  const { data: comments } = useOfflineSWR<IComment[]>(
    `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/comments`,
  );
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${orgId || transaction?.organization?.id}`,
  );
  const { data: user } = useOfflineSWR<User>(`user`);
  const canComment = useMemo(() => {
    if (!transaction || !organization) return false;
    return new TransactionPolicy(
      user ?? null,
      transaction,
      organization,
    ).show();
  }, [transaction, organization, user]);
  const { bottom: tabBarHeight } = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  useEffect(() => {
    if (transaction) {
      navigation.setOptions({
        title: transaction.memo,
        headerRight: () => (
          <ShareHeaderButton url={shareUrl.transaction(transaction.id)} />
        ),
      });
    }
  }, [transaction, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}`,
          undefined,
          { revalidate: true },
        ),
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/comments`,
          undefined,
          { revalidate: true },
        ),
        mutate(
          `organizations/${transaction?.organization?.id || orgId}/transactions/${txnId}/receipts`,
          { revalidate: true },
        ),
        globalMutate(
          (key) =>
            typeof key === "string" &&
            key.startsWith(
              `organizations/${transaction?.organization?.id || orgId}/transactions`,
            ),
        ),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!transaction || isLoading) {
    return <TransactionSkeleton />;
  }

  const currentOrgId = orgId || transaction?.organization?.id;
  if (!currentOrgId) {
    return <TransactionSkeleton />;
  }

  const transactionViewProps = { orgId: currentOrgId };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "position" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabBarHeight + 20,
        }}
        scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AdminTools
          style={{ marginBottom: 20 }}
          onPress={() =>
            Linking.openURL(
              `https://hcb.hackclub.com/hcb/${transaction.id.slice(4)}`,
            )
          }
        >
          <Text style={{ color: themeColors.text }} numberOfLines={1}>
            <Text style={{ color: palette.muted }}>HCB code:</Text>{" "}
            {transaction._debug?.hcb_code || `HCB-${transaction.code}`}
          </Text>
        </AdminTools>

        {match(transaction)
          .with({ card_charge: P.any }, (tx) => (
            <CardChargeTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ check: P.any }, (tx) => (
            <CheckTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ transfer: P.any }, (tx) => (
            <TransferTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ donation: P.any }, (tx) => (
            <DonationTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ ach_transfer: P.any }, (tx) => (
            <AchTransferTransaction
              transaction={tx}
              {...transactionViewProps}
            />
          ))
          .with({ wise_transfer: P.any }, (tx) => (
            <WiseTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ check_deposit: P.any }, (tx) => (
            <CheckDepositTransaction
              transaction={tx}
              {...transactionViewProps}
            />
          ))
          .with({ invoice: P.any }, (tx) => (
            <InvoiceTransaction transaction={tx} {...transactionViewProps} />
          ))
          .with({ expense_payout: P.any }, (tx) => (
            <ExpensePayoutTransaction
              transaction={tx}
              {...transactionViewProps}
            />
          ))
          .with({ code: TransactionType.BankFee }, (tx) => (
            <BankFeeTransaction transaction={tx} {...transactionViewProps} />
          ))
          .otherwise((tx) => (
            <BankAccountTransaction
              transaction={tx}
              {...transactionViewProps}
            />
          ))}

        {transaction.tags && transaction.tags.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 2,
              }}
            >
              Tags
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {transaction.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </View>
          </View>
        )}

        {(comments && comments.length > 0 || canComment) && (
          <View style={{ gap: 12 }}>
            {comments && comments.length > 0 && (
              <>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 13,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginLeft: 2,
                  }}
                >
                  Comments
                </Text>
                <View style={{ gap: 12 }}>
                  {comments.map((comment) => (
                    <Comment comment={comment} key={comment.id} />
                  ))}
                </View>
              </>
            )}
            {canComment && (
              <CommentField orgId={currentOrgId} transactionId={txnId} />
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
