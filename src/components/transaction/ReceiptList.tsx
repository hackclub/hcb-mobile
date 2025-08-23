import { connectActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Image } from "expo-image";
import { useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import Animated, { Easing, withTiming, Layout } from "react-native-reanimated";
import useSWR from "swr";

import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { logCriticalError } from "../../lib/errorUtils";
import { StackParamList } from "../../lib/NavigatorParamList";
import Receipt from "../../lib/types/Receipt";
import Transaction, {
  TransactionCardCharge,
} from "../../lib/types/Transaction";
import { useIsDark } from "../../lib/useColorScheme";
import { useOffline } from "../../lib/useOffline";
import { palette } from "../../theme";
import FileViewerModal from "../FileViewerModal";
import { useReceiptActionSheet } from "../ReceiptActionSheet";

export function ZoomAndFadeIn() {
  "worklet";
  const animations = {
    opacity: withTiming(1, { duration: 300 }),
    transform: [
      {
        scale: withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.back(2)),
        }),
      },
    ],
  };
  const initialValues = {
    opacity: 0,
    transform: [{ scale: 0.5 }],
  };
  return {
    initialValues,
    animations,
  };
}
const transition = Layout.duration(300).easing(Easing.out(Easing.quad));

function ReceiptList({ transaction }: { transaction: Transaction }) {
  const { params } = useRoute<RouteProp<StackParamList, "Transaction">>();
  const orgId =
    params.orgId ||
    (transaction as TransactionCardCharge).card_charge?.card?.organization
      ?.id ||
    "";

  const {
    data: receipts,
    isLoading,
    mutate,
  } = useSWR<Receipt[]>(
    `organizations/${orgId}/transactions/${transaction.id}/receipts`,
  );

  const { colors: themeColors } = useTheme();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(
    null,
  );

  const hcb = useClient();
  const isDark = useIsDark();
  const { isOnline, withOfflineCheck } = useOffline();

  const { handleActionSheet, isOnline: actionSheetIsOnline } =
    useReceiptActionSheet({
      orgId,
      transactionId: transaction.id,
      onUploadComplete: mutate,
    });

  const handleDeleteReceipt = withOfflineCheck(async (receipt: Receipt) => {
    showAlert(
      "Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingReceiptId(receipt.id);
              await hcb.delete(`receipts/${receipt.id.replace("rct_", "")}`);

              Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "Receipt Deleted",
                textBody: "The receipt has been successfully deleted.",
              });

              // Refresh the receipts list
              mutate();
            } catch (error) {
              logCriticalError("Error deleting receipt", error, {
                receiptId: receipt.id,
              });
              Toast.show({
                type: ALERT_TYPE.DANGER,
                title: "Delete Failed",
                textBody: "Failed to delete receipt. Please try again later.",
              });
            } finally {
              setDeletingReceiptId(null);
            }
          },
        },
      ],
    );
  });

  return (
    <View style={{ marginBottom: 30 }}>
      <Text
        style={{
          color: palette.muted,
          fontSize: 12,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Receipts
      </Text>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {receipts?.map((receipt) => (
          <TouchableOpacity
            key={receipt.id}
            onPress={() => {
              setSelectedReceipt(receipt);
              setIsImageViewerVisible(true);
            }}
          >
            <Animated.View key={receipt.id} entering={ZoomAndFadeIn}>
              <View style={{ position: "relative" }}>
                {receipt.preview_url ? (
                  <Image
                    source={{ uri: receipt.preview_url }}
                    style={{
                      width: 150,
                      height: 200,
                      backgroundColor: themeColors.card,
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 150,
                      height: 200,
                      backgroundColor: themeColors.card,
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Icon glyph="photo" size={52} color={palette.muted} />
                  </View>
                )}
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
                  onPress={() => handleDeleteReceipt(receipt)}
                  disabled={deletingReceiptId === receipt.id || !isOnline}
                >
                  {deletingReceiptId === receipt.id ? (
                    <ActivityIndicator size={20} color="red" />
                  ) : (
                    <Icon glyph="view-close" size={20} color="red" />
                  )}
                </TouchableOpacity>
              </View>
              <Text
                style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}
              >
                Added {formatDistanceToNowStrict(parseISO(receipt.created_at))}{" "}
                ago
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}

        <FileViewerModal
          fileUrl={selectedReceipt?.url || null}
          filename={selectedReceipt?.filename || null}
          visible={isImageViewerVisible}
          onRequestClose={() => {
            setIsImageViewerVisible(false);
            setSelectedReceipt(null);
          }}
        />

        <TouchableOpacity
          onPress={handleActionSheet}
          disabled={!actionSheetIsOnline}
        >
          <Animated.View
            style={{
              width: 150,
              height: 200,
              borderRadius: 8,
              backgroundColor: themeColors.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: actionSheetIsOnline ? 1 : 0.7,
            }}
            layout={transition}
          >
            {isLoading && !transaction.missing_receipt ? (
              <ActivityIndicator color={palette.muted} />
            ) : (
              <>
                <Ionicons
                  name="add-circle-outline"
                  color={palette.muted}
                  size={36}
                />
                <Text style={{ color: palette.muted, marginTop: 10 }}>
                  Add Receipt
                </Text>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const connectedApp = connectActionSheet(ReceiptList);
export default connectedApp;
