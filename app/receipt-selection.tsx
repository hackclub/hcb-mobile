import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert, showFailureAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import RootSWRConfig from "@/lib/providers/RootSWRConfig";
import { invalidateReceiptCaches } from "@/lib/receipts";
import { toast } from "@/lib/toast";
import Receipt from "@/lib/types/Receipt";
import { useOffline } from "@/lib/useOffline";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { maybeRequestReview } from "@/utils/storeReview";

function ReceiptSelection() {
  const { transaction: rawTransaction } = useLocalSearchParams();
  const transaction = useMemo(() => {
    if (typeof rawTransaction !== "string") return null;
    try {
      return JSON.parse(rawTransaction) as {
        id?: string;
        memo?: string;
        organization?: { id?: string };
      } | null;
    } catch {
      return null;
    }
  }, [rawTransaction]);

  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const { isOnline } = useOffline();
  // Scoped, not the global `mutate` from "swr": that one targets SWR's default
  // cache, so revalidations never reached the tree holding the real data.
  const { mutate } = useSWRConfig();

  const {
    data: receipts,
    error: receiptsError,
    isLoading: receiptsLoading,
    mutate: reloadReceipts,
  } = useOfflineSWR<Receipt[]>("receipts");
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(
    new Set(),
  );
  const [uploading, setUploading] = useState(false);
  const [deletingReceipts, setDeletingReceipts] = useState<Set<string>>(
    new Set(),
  );

  const uploadFile = async (receipt: Receipt) => {
    const body = new FormData();
    body.append("file", {
      uri: receipt.url,
      name: receipt.filename || "receipt.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    if (transaction?.id) {
      body.append("transaction_id", transaction.id);
    }

    await hcb.post(`receipts`, {
      body,
    });
  };

  const deleteReceipt = async (receiptId: string) => {
    await hcb.delete(`receipts/${receiptId.replace("rct_", "")}`);
  };

  const handleUpload = async () => {
    if (!transaction?.id) {
      showAlert(
        "Missing Transaction",
        "We couldn't identify the transaction for this upload. Please go back and try again.",
      );
      return;
    }

    if (selectedReceipts.size === 0) {
      showAlert(
        "No Receipts Selected",
        "Please select at least one receipt to upload.",
      );
      return;
    }

    setUploading(true);

    const chosen =
      receipts?.filter((receipt) => selectedReceipts.has(receipt.id)) || [];
    const total = chosen.length;
    const noun = total === 1 ? "receipt" : `${total} receipts`;
    const toastId = toast.loading(`Attaching ${noun}…`);

    // Track successes individually: a partial failure used to abort the loop,
    // leaving already-uploaded receipts sitting in the bin and reporting the
    // whole batch as failed.
    const attached: string[] = [];
    let lastError: unknown = null;

    try {
      for (let i = 0; i < total; i++) {
        if (total > 1) {
          toast.update(toastId, {
            type: "loading",
            title: `Attaching ${noun}…`,
            message: `${i + 1} of ${total}`,
          });
        }
        try {
          await uploadFile(chosen[i]);
          attached.push(chosen[i].id);
        } catch (error) {
          lastError = error;
          console.error("Receipt attach failed", error, {
            context: {
              transactionId: transaction?.id,
              receiptId: chosen[i].id,
            },
          });
        }
      }

      // Only remove from the bin what actually made it onto the transaction.
      if (attached.length) {
        setDeletingReceipts(new Set(attached));
        for (const receiptId of attached) {
          try {
            await deleteReceipt(receiptId);
          } catch (error) {
            console.error("Receipt bin cleanup failed", error, {
              context: { receiptId },
            });
          }
        }
      }

      await invalidateReceiptCaches(mutate, {
        orgId: transaction?.organization?.id,
        transactionId: transaction?.id,
      });

      if (attached.length === total) {
        toast.update(toastId, {
          type: "success",
          title:
            total === 1 ? "Receipt attached" : `${total} receipts attached`,
        });
        maybeRequestReview();
        router.back();
      } else if (attached.length > 0) {
        toast.update(toastId, {
          type: "warning",
          title: `Attached ${attached.length} of ${total}`,
          message: await parseApiError(
            lastError,
            "The rest are still in your receipt bin.",
          ),
        });
      } else {
        // Nothing attached — modal, not a toast, since the user needs to decide
        // whether to retry. Re-attaching is safe: nothing was removed from the
        // bin, because only successful uploads get deleted above.
        toast.dismiss(toastId);
        showFailureAlert(
          "Attach failed",
          await parseApiError(
            lastError,
            "Nothing was uploaded. Your receipts are still in the bin.",
          ),
          handleUpload,
        );
      }
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
      setSelectedReceipts(new Set(receipts.map((receipt) => receipt.id)));
    }
  };

  const clearSelection = () => {
    setSelectedReceipts(new Set());
  };

  // "No receipts" used to also mean "still loading", "request failed" and
  // "offline" — which is how a bin holding three receipts reported itself empty.
  if (!receipts?.length) {
    const state = receiptsLoading
      ? ("loading" as const)
      : !isOnline
        ? ("offline" as const)
        : receiptsError
          ? ("error" as const)
          : ("empty" as const);

    const copy = {
      loading: { icon: null, title: "", body: "" },
      offline: {
        icon: "cloud-offline-outline" as const,
        title: "You're offline",
        body: "Reconnect to load the receipts in your bin.",
      },
      error: {
        icon: "alert-circle-outline" as const,
        title: "Couldn't load your receipt bin",
        body: "Something went wrong fetching your receipts. Your bin may not be empty.",
      },
      empty: {
        icon: "receipt-outline" as const,
        title: "Receipt Bin is Empty",
        body: "No receipts available in your receipt bin to upload to this transaction.",
      },
    }[state];

    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: themeColors.background }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          {state === "loading" ? (
            <ActivityIndicator color={themeColors.primary} />
          ) : (
            <>
              <Ionicons name={copy.icon!} color={palette.muted} size={60} />
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 18,
                  fontWeight: "600",
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                {copy.title}
              </Text>
              <Text
                style={{
                  color: palette.muted,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {copy.body}
              </Text>
              {state === "empty" ? (
                <Button onPress={() => router.back()} style={{ marginTop: 24 }}>
                  Go Back
                </Button>
              ) : (
                <View style={{ marginTop: 24, gap: 10, alignSelf: "stretch" }}>
                  <Button
                    variant="primary"
                    onPress={() => reloadReceipts()}
                    loading={receiptsLoading}
                  >
                    Try again
                  </Button>
                  <Button variant="ghost" onPress={() => router.back()}>
                    Go Back
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginRight: 16,
              padding: 8,
            }}
          >
            <Ionicons name="close" size={24} color={themeColors.text} />
          </TouchableOpacity>
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
              {transaction?.memo}
            </Text>
          </View>
        </View>
        <Button
          onPress={handleUpload}
          disabled={uploading || selectedReceipts.size === 0}
          loading={uploading}
          style={{ paddingVertical: 8, paddingHorizontal: 14 }}
        >
          {`Upload (${selectedReceipts.size})`}
        </Button>
      </View>

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

// Root-level route: it renders outside `(app)`, so it must bring its own SWR
// fetcher and cache. Without this the "receipts" key resolved to undefined and
// the bin reported itself empty.
export default function Page() {
  return (
    <RootSWRConfig>
      <ReceiptSelection />
    </RootSWRConfig>
  );
}
