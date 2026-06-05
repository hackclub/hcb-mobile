import { connectActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import Icon from "@thedev132/hackclub-icons-rn";
import { Text } from "@/components/Text";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import Animated, { Easing, Layout, withTiming } from "react-native-reanimated";
import useSWR from "swr";

import FileViewerModal from "@/components/FileViewerModal";
import { useReceiptActionSheet } from "@/components/ReceiptActionSheet";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import Receipt from "@/lib/types/Receipt";
import Transaction from "@/lib/types/Transaction";
import { useIsDark } from "@/lib/useColorScheme";
import { useOffline } from "@/lib/useOffline";
import { palette } from "@/styles/theme";

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
  const params = useLocalSearchParams<{
    id?: string;
    orgId?: string;
    attachReceipt?: string;
  }>();
  const orgId =
    params.orgId ||
    params.id ||
    (transaction as Transaction).organization?.id ||
    "";
  const attachReceipt = params.attachReceipt;

  const {
    data: receipts,
    isLoading,
    mutate,
  } = useSWR<Receipt[]>(
    `organizations/${transaction?.organization?.id || orgId}/transactions/${transaction.id}/receipts`,
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
      const timer = setTimeout(() => {
        handleActionSheet(addReceiptButtonRef);
      }, 600);
      return () => clearTimeout(timer);
    }
    // Run only once on component mount. attachReceipt and actionSheetIsOnline are expected
    // to be stable across renders for this effect to work correctly.
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

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
                textBody: await parseApiError(error, "Failed to delete receipt. Please try again later."),
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
                textBody: await parseApiError(error, "Failed to mark receipt as lost. Please try again later."),
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
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 10,
          marginLeft: 2,
        }}
      >
        Receipts
      </Text>
      <View
        style={{
          flexDirection: "row",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {receipts?.map((receipt) => (
          <Pressable
            key={receipt.id}
            onPress={() => {
              setSelectedReceipt(receipt);
              setIsImageViewerVisible(true);
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
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
                      borderRadius: 14,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 150,
                      height: 200,
                      backgroundColor: themeColors.card,
                      borderRadius: 14,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Icon glyph="photo" size={52} color={palette.muted} />
                  </View>
                )}
                <Pressable
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: 4,
                    borderRadius: 100,
                    backgroundColor: isDark ? "#26181F" : "#ECE0E2",
                    opacity: pressed ? 0.6 : 0.8,
                  })}
                  onPress={() => handleDeleteReceipt(receipt)}
                  disabled={deletingReceiptId === receipt.id || !isOnline}
                >
                  {deletingReceiptId === receipt.id ? (
                    <ActivityIndicator size={20} color="red" />
                  ) : (
                    <Icon glyph="view-close" size={20} color="red" />
                  )}
                </Pressable>
              </View>
              <Text
                style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}
              >
                Added {formatDistanceToNowStrict(parseISO(receipt.created_at))}{" "}
                ago
              </Text>
            </Animated.View>
          </Pressable>
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

        <Pressable
          ref={addReceiptButtonRef}
          onPress={() => handleActionSheet(addReceiptButtonRef)}
          disabled={!actionSheetIsOnline}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Animated.View
            style={{
              width: 150,
              height: 200,
              borderRadius: 14,
              backgroundColor: themeColors.card,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              borderStyle: "dashed",
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
        </Pressable>
      </View>

      {missingReceipt && !lostReceipt && (
        <Pressable
          onPress={handleMarkLostReceipt}
          disabled={isMarkingLostReceipt || !isOnline}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 12,
            opacity: isOnline ? (pressed ? 0.6 : 1) : 0.5,
          })}
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
        </Pressable>
      )}

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
