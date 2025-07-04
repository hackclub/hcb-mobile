import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR, { mutate } from "swr";

import useClient from "../lib/client";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import { TransactionCardCharge } from "../lib/types/Transaction";
import Receipt from "../lib/types/Receipt";
import { palette } from "../theme";
import { renderMoney } from "../util";

type Props = NativeStackScreenProps<ReceiptsStackParamList, "ReceiptSelectionModal">;

export default function ReceiptSelectionModal({
  route: {
    params: { transaction },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  
  const { data: receipts } = useSWR<Receipt[]>("user/receipt_bin");
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deletingReceipts, setDeletingReceipts] = useState<Set<string>>(new Set());

  const uploadFile = async (receipt: Receipt) => {
    const body = new FormData();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    body.append("file", {
      uri: receipt.url,
      name: receipt.filename || "receipt.jpg",
      type: "image/jpeg",
    });

    await hcb.post(
      `organizations/${transaction.organization.id}/transactions/${transaction.id}/receipts`,
      {
        body,
      },
    );
  };

  const deleteReceipt = async (receiptId: string) => {
    await hcb.delete(`user/receipt_bin/${receiptId}`);
  };

  const handleUpload = async () => {
    if (selectedReceipts.size === 0) {
      Alert.alert(
        "No Receipts Selected",
        "Please select at least one receipt to upload.",
      );
      return;
    }

    setUploading(true);

    try {
      const selectedReceiptList = receipts?.filter(receipt => 
        selectedReceipts.has(receipt.id)
      ) || [];

      // Upload all selected receipts
      for (const receipt of selectedReceiptList) {
        await uploadFile(receipt);
      }

      // Delete all uploaded receipts from receipt bin
      setDeletingReceipts(new Set(selectedReceipts));
      
      for (const receiptId of selectedReceipts) {
        await deleteReceipt(receiptId);
      }

      // Refresh the receipt bin data
      await mutate("user/receipt_bin");
      await mutate("user/transactions/missing_receipt");

      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "Receipts Uploaded!",
        textBody: `Successfully uploaded ${selectedReceipts.size} receipt(s) and removed them from receipt bin.`,
      });

      navigation.goBack();
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Upload Failed",
        textBody: "Some receipts failed to upload. Please try again.",
      });
    } finally {
      setUploading(false);
      setDeletingReceipts(new Set());
    }
  };

  const toggleReceiptSelection = (receiptId: string) => {
    const newSelected = new Set(selectedReceipts);
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId);
    } else {
      newSelected.add(receiptId);
    }
    setSelectedReceipts(newSelected);
  };

  const selectAllReceipts = () => {
    if (receipts) {
      setSelectedReceipts(new Set(receipts.map(receipt => receipt.id)));
    }
  };

  const clearSelection = () => {
    setSelectedReceipts(new Set());
  };

  if (!receipts || receipts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Ionicons name="receipt-outline" color={palette.muted} size={60} />
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 18, 
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 8,
          }}>
            Receipt Bin is Empty
          </Text>
          <Text style={{ 
            color: palette.muted, 
            textAlign: "center",
            lineHeight: 20,
          }}>
            No receipts available in your receipt bin to upload to this transaction.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: palette.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24,
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header */}
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {Platform.OS === "android" && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                marginRight: 16,
                padding: 8,
              }}
            >
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: themeColors.text,
              }}
            >
              Select Receipts
            </Text>
            <Text style={{ color: palette.muted, fontSize: 14, marginTop: 2 }}>
              {transaction.memo}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading || selectedReceipts.size === 0}
          style={{
            backgroundColor: uploading || selectedReceipts.size === 0 ? palette.muted : palette.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {uploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="cloud-upload-outline" color="white" size={20} />
          )}
          {!uploading && (
            <Text style={{ color: "white", fontWeight: "600" }}>
              Upload ({selectedReceipts.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Selection Controls */}
      <View
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: palette.muted, fontSize: 14 }}>
          {selectedReceipts.size} of {receipts.length} selected
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={selectAllReceipts}
            style={{
              backgroundColor: palette.info,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
              Select All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clearSelection}
            style={{
              backgroundColor: palette.muted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Receipts Grid */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {receipts.map((receipt) => {
            const isSelected = selectedReceipts.has(receipt.id);
            const isDeleting = deletingReceipts.has(receipt.id);
            const isUploading = uploading && isSelected;

            return (
              <TouchableOpacity
                key={receipt.id}
                onPress={() => toggleReceiptSelection(receipt.id)}
                disabled={isUploading || isDeleting}
                style={{
                  width: "48%",
                  opacity: isUploading || isDeleting ? 0.6 : 1,
                }}
              >
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: receipt.preview_url || receipt.url }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 8,
                      backgroundColor: themeColors.card,
                      borderWidth: isSelected ? 3 : 0,
                      borderColor: palette.primary,
                    }}
                    contentFit="cover"
                  />
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: palette.primary,
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="checkmark" color="white" size={16} />
                    </View>
                  )}

                  {/* Loading indicator */}
                  {(isUploading || isDeleting) && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator color="white" size="small" />
                    </View>
                  )}
                </View>
                
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {receipt.filename}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 