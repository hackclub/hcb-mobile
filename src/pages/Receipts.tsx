import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Icon from "@thedev132/hackclub-icons-rn";
import { formatDistanceToNow, formatDistanceToNowStrict, parseISO } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useState, useMemo, useLayoutEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import ImageView from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";

import UploadIcon from "../components/icons/UploadIcon";
import { useReceiptActionSheet } from "../components/ReceiptActionSheet";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import { useIsDark } from "../lib/useColorScheme";
import Organization from "../lib/types/Organization";
import Receipt from "../lib/types/Receipt";
import { TransactionCardCharge } from "../lib/types/Transaction";
import p from "../palette";
import { palette } from "../theme";
import { renderMoney } from "../util";

function Transaction({
  transaction,
  onComplete,
  _onUpload,
  onSelect,
}: {
  transaction: TransactionCardCharge & { organization: Organization };
  onComplete: () => void;
  _onUpload: (transaction: TransactionCardCharge & { organization: Organization }) => void;
  onSelect: (transaction: TransactionCardCharge & { organization: Organization }) => void;
}) {
  const { colors: themeColors } = useTheme();
  const [loading, setLoading] = useState(false);

  const { handleActionSheet, isOnline } = useReceiptActionSheet({
    orgId: transaction.organization.id,
    transactionId: transaction.id,
    onUploadComplete: () => {
      setLoading(false);
      onComplete();
    },
  });

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            fontWeight: "500",
            marginBottom: 4 
          }}>
            {transaction.memo}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              {renderMoney(Math.abs(transaction.amount_cents))}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>•</Text>
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              {formatDistanceToNow(new Date(transaction.card_charge.spent_at))} ago
            </Text>
          </View>
        </View>
        
        <View style={{ flexDirection: "row", gap: 12, marginLeft: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: p.sky["500"],
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleActionSheet}
            disabled={!isOnline || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <UploadIcon size={26} color="white" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: p.rose["500"],
              borderRadius: 20,
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => onSelect(transaction)}
            disabled={!isOnline || loading}
          >
            <Icon glyph="payment-docs" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function OrganizationSection({
  organization,
  transactions,
  onComplete,
  onUpload,
  onSelect,
}: {
  organization: Organization;
  transactions: (TransactionCardCharge & { organization: Organization })[];
  onComplete: () => void;
  onUpload: (transaction: TransactionCardCharge & { organization: Organization }) => void;
  onSelect: (transaction: TransactionCardCharge & { organization: Organization }) => void;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: themeColors.text,
            flex: 1,
          }}
        >
          {organization.name}
        </Text>
        <View
          style={{
            backgroundColor: themeColors.card,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 14 }}>
            {transactions.length}
          </Text>
        </View>
      </View>
      {transactions.map((transaction) => (
        <Transaction
          key={transaction.id}
          transaction={transaction}
          onComplete={onComplete}
          _onUpload={onUpload}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

type Props = NativeStackScreenProps<ReceiptsStackParamList, "MissingReceiptList">;

export default function ReceiptsPage({ navigation }: Props) {
  const { colors: themeColors } = useTheme();
  const { data, mutate, isLoading } = useSWR<{
    data: (TransactionCardCharge & { organization: Organization })[];
  }>("user/transactions/missing_receipt");
  const { data: receipts } = useSWR<Receipt[]>("user/receipt_bin");
  const [ImageViewerIndex, setImageViewerIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isDark = useIsDark();
  console.log(receipts);

  // Set navigation title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "My receipts",
    });
  }, [navigation]);

  useFocusEffect(() => {
    mutate();
  });

  // Group transactions by organization
  const groupedTransactions = useMemo(() => {
    if (!data?.data) return [];
    
    const groups = data.data.reduce((acc, transaction) => {
      const orgId = transaction.organization.id;
      if (!acc[orgId]) {
        acc[orgId] = {
          organization: transaction.organization,
          transactions: [],
        };
      }
      acc[orgId].transactions.push(transaction);
      return acc;
    }, {} as Record<string, { organization: Organization; transactions: (TransactionCardCharge & { organization: Organization })[] }>);

    return Object.values(groups);
  }, [data?.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const { handleActionSheet } = useReceiptActionSheet({
    orgId: data?.data[0]?.organization?.id || "",
    transactionId: data?.data[0]?.id || "",
  });
  const handleTransactionUpload = async (transaction: TransactionCardCharge & { organization: Organization }) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        // Navigate to ShareIntentModal with this specific transaction pre-selected
        (navigation as any).navigate("ShareIntentModal", {
          images: result.assets.map(asset => asset.uri),
          missingTransactions: [transaction],
        });
      }
    } catch (error) {
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Upload Failed",
        textBody: "Failed to select receipts from device",
      });
    }
  };

  const handleTransactionSelect = (transaction: TransactionCardCharge & { organization: Organization }) => {
    // Navigate to ReceiptSelectionModal
    (navigation as any).navigate("ReceiptSelectionModal", {
      transaction,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ position: "relative" }}>
              <Ionicons name="receipt-outline" color={palette.muted} size={60} />
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  backgroundColor: p.emerald["400"],
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" color="white" size={16} />
              </View>
            </View>
          </View>
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 18, 
            fontWeight: "600",
            marginBottom: 8,
          }}>
            Receipt Bin is empty
          </Text>
          <Text style={{ 
            color: palette.muted, 
            textAlign: "center",
            lineHeight: 20,
          }}>
            All your transactions have receipts attached.{"\n"}
            Great job staying organized!
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Receipts */}
        <ScrollView horizontal style={{ marginBottom: 20 }} >
        {receipts?.map((receipt) => (
          <TouchableOpacity
            key={receipt.id}
            onPress={() => {
              setImageViewerIndex(receipts.indexOf(receipt));
              setIsImageViewerVisible(true);
            }}
          >
            <View key={receipt.id}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: receipt.preview_url }}
                  style={{
                    width: 150,
                    height: 200,
                    backgroundColor: themeColors.card,
                    borderRadius: 8,
                  }}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: 4,
                    backgroundClip: "padding-box",
                    borderRadius: 100,
                    backgroundColor: isDark ? "#26181F" : "#ECE0E2",
                    opacity: 0.8,
                  }}
                  onPress={() => {}}
                >
                    <Icon glyph="view-close" size={20} color="red" />
                </TouchableOpacity>
              </View>
              <Text
                style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}
              >
                Added {formatDistanceToNowStrict(parseISO(receipt.created_at))}{" "}
                ago
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        </ScrollView>
        <ImageView
          images={
            receipts?.map((receipt) => {
              const isImage = /\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i.test(
                receipt.url || "",
              );
              return { uri: isImage ? receipt.url : receipt.preview_url };
            }) || []
          }
          imageIndex={ImageViewerIndex}
          visible={isImageViewerVisible}
          onRequestClose={() => setIsImageViewerVisible(false)}
        />





        {/* Upload Section */}
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: p.sky["500"],
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
            onPress={handleActionSheet}
          >
            <UploadIcon size={28} color="white" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              Upload receipt
            </Text>
          </TouchableOpacity>
          <Text style={{ color: palette.muted, textAlign: "center", fontSize: 14 }}>
            Select photos from your device
          </Text>
        </View>

        {/* Transactions Section */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "600", color: themeColors.text }}>
              Transactions
            </Text>
            <View
              style={{
                backgroundColor: themeColors.card,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 14 }}>
                {data?.data?.length || 0}
              </Text>
            </View>
          </View>

          {groupedTransactions.map(({ organization, transactions }) => (
            <OrganizationSection
              key={organization.id}
              organization={organization}
              transactions={transactions}
              onComplete={() => mutate()}
              onUpload={handleTransactionUpload}
              onSelect={handleTransactionSelect}
            />
          ))}
        </View>
      </ScrollView>
  );
}
