import { connectActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useTheme } from "@react-navigation/native";
import Icon from "@thedev132/hackclub-icons-rn";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Image } from "expo-image";
import { useState, useRef, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import Animated, { Easing, withTiming, Layout } from "react-native-reanimated";
import useSWR from "swr";

import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { StackParamList } from "../../lib/NavigatorParamList";
import Receipt from "../../lib/types/Receipt";
import Transaction, {
  TransactionCardCharge,
} from "../../lib/types/Transaction";
import { useIsDark } from "../../lib/useColorScheme";
import { useOffline } from "../../lib/useOffline";
import { palette } from "../../styles/theme";
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
  const attachReceipt = params.attachReceipt;

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
  const [isMarkingLostReceipt, setIsMarkingLostReceipt] = useState(false);
  const [lostReceipt, setLostReceipt] = useState(transaction.lost_receipt);
  const [missingReceipt, setMissingReceipt] = useState(
    transaction.missing_receipt,
  );

  const hcb = useClient();
  const isDark = useIsDark();
  const { isOnline, withOfflineCheck } = useOffline();
  const addReceiptButtonRef = useRef(null);

  useEffect(() => {
    setLostReceipt(transaction.lost_receipt);
    setMissingReceipt(transaction.missing_receipt);
  }, [transaction.lost_receipt, transaction.missing_receipt]);

  const { handleActionSheet, isOnline: actionSheetIsOnline } =
    useReceiptActionSheet({
      orgId,
      transactionId: transaction.id,
      onUploadComplete: mutate,
    });

  useEffect(() => {
    if (attachReceipt && actionSheetIsOnline) {
      // we add a small delay to ensure component is mounted
      const timer = setTimeout(() => {
        handleActionSheet(addReceiptButtonRef);
      }, 600);
      return () => clearTimeout(timer);
    }
  // only run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              if (receipts && receipts.length === 1) {
                setLostReceipt(false);
                setMissingReceipt(true);
              }
            } catch (error) {
              console.error("Error deleting receipt", error, {
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

  const handleMarkLostReceipt = withOfflineCheck(async () => {
    showAlert(
      "No/Lost Receipt",
      "Mark this transaction as having a lost or unavailable receipt? This should only be used when you genuinely cannot provide a receipt.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Mark as Lost",
          style: "destructive",
          onPress: async () => {
            try {
              setIsMarkingLostReceipt(true);
              await hcb.post(`transactions/${transaction.id}/mark_no_receipt`);

              Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: "Receipt Marked as Lost",
                textBody:
                  "This transaction has been marked as having a lost receipt.",
              });

              setLostReceipt(true);
              setMissingReceipt(false);
            } catch (error) {
              console.error("Error marking receipt as lost", error, {
                transactionId: transaction.id,
              });
              Toast.show({
                type: ALERT_TYPE.DANGER,
                title: "Failed",
                textBody:
                  "Failed to mark receipt as lost. Please try again later.",
              });
            } finally {
              setIsMarkingLostReceipt(false);
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
          ref={addReceiptButtonRef}
          onPress={() => handleActionSheet(addReceiptButtonRef)}
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
            {isLoading && !missingReceipt ? (
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

      {missingReceipt && !lostReceipt && (
        <TouchableOpacity
          onPress={handleMarkLostReceipt}
          disabled={isMarkingLostReceipt || !isOnline}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 12,
            opacity: isOnline ? 1 : 0.5,
          }}
        >
          {isMarkingLostReceipt ? (
            <ActivityIndicator
              size="small"
              color={palette.muted}
              style={{ marginRight: 6 }}
            />
          ) : (
            <Ionicons
              name="close-circle-outline"
              color={palette.muted}
              size={16}
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={{
              color: palette.muted,
              fontSize: 14,
              textDecorationLine: "underline",
            }}
          >
            No/lost receipt?
          </Text>
        </TouchableOpacity>
      )}

      {/* Show indicator when receipt is already marked as lost */}
      {lostReceipt && receipts && receipts.length === 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 12,
            backgroundColor: palette.warning,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Icon
            glyph="view-close"
            size={20}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: "white",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Marked as lost receipt
          </Text>
        </View>
      )}
    </View>
  );
}

const connectedApp = connectActionSheet(ReceiptList);
export default connectedApp;
