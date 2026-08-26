import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert, showFailureAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { invalidateReceiptCaches } from "@/lib/receipts";
import { toast } from "@/lib/toast";
import Organization from "@/lib/types/Organization";
import Transaction from "@/lib/types/Transaction";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";
import { maybeRequestReview } from "@/utils/storeReview";

/** "3 to transactions, 1 to your bin" — omits whichever side is zero. */
function describeDestinations(
  toTransactions: number,
  toBin: number,
): string | undefined {
  const parts: string[] = [];
  if (toTransactions > 0) parts.push(`${toTransactions} to transactions`);
  if (toBin > 0) parts.push(`${toBin} to your receipt bin`);
  return parts.length > 1 ? parts.join(", ") : undefined;
}

interface ImageAssignment {
  imageUri: string;
  transactionId: string | null;
  orgId: string | null;
  isReceiptBin?: boolean;
}

const parseJsonParam = <T,>(value: unknown): T | null => {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeImageParam = (value: unknown): string[] => {
  const rawValue = Array.isArray(value)
    ? value
    : parseJsonParam<unknown>(value);
  if (!Array.isArray(rawValue)) return [];
  return rawValue.filter(
    (img): img is string => typeof img === "string" && img.length > 0,
  );
};

const normalizeMissingTransactionsParam = (
  value: unknown,
): Array<Transaction & { organization: Organization }> => {
  const rawValue = Array.isArray(value)
    ? value
    : parseJsonParam<unknown>(value);
  if (!Array.isArray(rawValue)) return [];

  return rawValue.filter(
    (
      transaction,
    ): transaction is Transaction & { organization: Organization } => {
      if (!transaction || typeof transaction !== "object") return false;
      const maybeTransaction = transaction as Partial<Transaction> & {
        organization?: Partial<Organization>;
      };
      return (
        typeof maybeTransaction.id === "string" &&
        typeof maybeTransaction.organization?.id === "string"
      );
    },
  );
};

function ShareIntent() {
  const { images: rawImages, missingTransactions: rawMissingTransactions } =
    useLocalSearchParams();

  const images = useMemo(() => normalizeImageParam(rawImages), [rawImages]);
  const validTransactions = useMemo(
    () => normalizeMissingTransactionsParam(rawMissingTransactions),
    [rawMissingTransactions],
  );

  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  // Scoped mutate: the global one from "swr" targets SWR's default cache, which
  // nothing in this app reads.
  const { mutate } = useSWRConfig();

  const validImages = useMemo(
    () =>
      images?.filter((img: unknown) => img && typeof img === "string") || [],
    [images],
  );

  const [assignments, setAssignments] = useState<ImageAssignment[]>(
    validImages.map((uri) => ({
      imageUri: uri,
      transactionId: null,
      orgId: null,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (validImages.length > 0 && assignments.length !== validImages.length) {
      setAssignments(
        validImages.map((uri) => ({
          imageUri: uri,
          transactionId: null,
          orgId: null,
        })),
      );
    }
  }, [validImages, assignments.length]);

  useEffect(() => {
    if (validImages.length === 0) {
      showAlert(
        "Invalid Share Intent",
        "No valid images were provided. Please try sharing again.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [validImages, validTransactions]);

  const handleImageSelect = (
    imageIndex: number,
    transaction: Transaction & { organization: Organization },
  ) => {
    setAssignments((prev) =>
      prev.map((assignment, index) =>
        index === imageIndex
          ? {
              imageUri: assignment.imageUri,
              transactionId: transaction.id,
              orgId: transaction.organization.id,
            }
          : assignment,
      ),
    );
    setSelectedImageIndex(null);
  };

  const handleSelectAll = (
    transaction: Transaction & { organization: Organization },
  ) => {
    setAssignments((prev) =>
      prev.map((assignment) => ({
        imageUri: assignment.imageUri,
        transactionId: transaction.id,
        orgId: transaction.organization.id,
        isReceiptBin: false,
      })),
    );
    setSelectedImageIndex(null);
  };

  const handleReceiptBinSelect = (imageIndex: number) => {
    setAssignments((prev) =>
      prev.map((assignment, index) =>
        index === imageIndex
          ? {
              imageUri: assignment.imageUri,
              transactionId: null,
              orgId: null,
              isReceiptBin: true,
            }
          : assignment,
      ),
    );
    setSelectedImageIndex(null);
  };

  const handleReceiptBinSelectAll = () => {
    setAssignments((prev) =>
      prev.map((assignment) => ({
        imageUri: assignment.imageUri,
        transactionId: null,
        orgId: null,
        isReceiptBin: true,
      })),
    );
    setSelectedImageIndex(null);
  };

  const handleUnassignImage = (imageIndex: number) => {
    setAssignments((prev) =>
      prev.map((assignment, index) =>
        index === imageIndex
          ? {
              imageUri: assignment.imageUri,
              transactionId: null,
              orgId: null,
              isReceiptBin: false,
            }
          : assignment,
      ),
    );
  };

  const uploadFile = async (
    file: {
      uri: string;
      fileName?: string;
      mimeType?: string;
    },
    orgId: string,
    transactionId: string,
  ) => {
    const body = new FormData();
    body.append("file", {
      uri: file.uri,
      name: file.fileName || "receipt.jpg",
      type: file.mimeType || "image/jpeg",
    } as unknown as Blob);

    if (transactionId && transactionId.trim() !== "") {
      body.append("transaction_id", transactionId);
    }

    await hcb.post(`receipts`, {
      body,
    });
  };

  const handleUpload = async () => {
    const transactionAssignments = assignments.filter(
      (a) => a.transactionId && a.orgId && !a.isReceiptBin,
    );
    const receiptBinAssignments = assignments.filter((a) => a.isReceiptBin);

    if (
      transactionAssignments.length === 0 &&
      receiptBinAssignments.length === 0
    ) {
      showAlert(
        "No Assignments",
        "Please assign at least one image to a transaction or receipt bin before uploading.",
      );
      return;
    }

    setUploading(true);

    const queue = [
      ...transactionAssignments.filter((a) => a.transactionId && a.orgId),
      ...receiptBinAssignments,
    ];
    const total = queue.length;
    const toastId = toast.loading(
      total === 1 ? "Uploading receipt…" : `Uploading ${total} receipts…`,
    );

    // Per-item tolerance: one bad image used to abort the whole batch and
    // report everything as failed, including receipts already on the server.
    const touched: { orgId?: string; transactionId?: string }[] = [];
    let lastError: unknown = null;

    try {
      for (let i = 0; i < total; i++) {
        const assignment = queue[i];
        const toTransaction = !assignment.isReceiptBin;

        if (total > 1) {
          toast.update(toastId, {
            type: "loading",
            title: `Uploading ${total} receipts…`,
            message: `${i + 1} of ${total}`,
          });
        }

        try {
          await uploadFile(
            {
              uri: assignment.imageUri,
              fileName: `receipt_${Date.now()}.jpg`,
              mimeType: "image/jpeg",
            },
            toTransaction ? assignment.orgId! : "",
            toTransaction ? assignment.transactionId! : "",
          );
          touched.push(
            toTransaction
              ? {
                  orgId: assignment.orgId ?? undefined,
                  transactionId: assignment.transactionId ?? undefined,
                }
              : {},
          );
        } catch (error) {
          lastError = error;
          console.error("Share-intent receipt upload failed", error, {
            context: { index: i, toTransaction },
          });
        }
      }

      // This screen previously invalidated nothing at all — it imported no SWR
      // — so a successful share-sheet upload never updated the bin, the badge,
      // or the transaction it attached to.
      for (const scope of touched.length ? touched : [{}]) {
        await invalidateReceiptCaches(mutate, scope);
      }

      if (touched.length === total) {
        toast.update(toastId, {
          type: "success",
          title:
            total === 1 ? "Receipt uploaded" : `${total} receipts uploaded`,
          message: describeDestinations(
            transactionAssignments.length,
            receiptBinAssignments.length,
          ),
        });
        maybeRequestReview();
        router.back();
      } else if (touched.length > 0) {
        toast.update(toastId, {
          type: "warning",
          title: `Uploaded ${touched.length} of ${total}`,
          message: await parseApiError(lastError, "Some receipts failed."),
        });
      } else {
        // Nothing landed — modal so it can't be missed, with a retry since
        // re-uploading is safe and the assignments are still on screen.
        toast.dismiss(toastId);
        showFailureAlert(
          "Upload failed",
          await parseApiError(
            lastError,
            "Please check your connection and try again.",
          ),
          handleUpload,
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const getAssignmentForImage = (imageUri: string) => {
    return assignments.find((a) => a.imageUri === imageUri);
  };

  const getTransactionForAssignment = (assignment: ImageAssignment) => {
    if (!assignment) {
      console.error(
        "getTransactionForAssignment called with undefined assignment",
        new Error("Undefined assignment"),
        {
          context: { action: "transaction_assignment" },
        },
      );
      return null;
    }
    if (assignment.isReceiptBin)
      return { memo: "Receipt Bin", id: "receipt-bin" };
    if (!assignment.transactionId) return null;
    return validTransactions.find((t) => t.id === assignment.transactionId);
  };

  if (validImages.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 16 }}>
          No valid images to process
        </Text>
      </View>
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
          {Platform.OS === "android" && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                marginRight: 16,
                padding: 8,
              }}
            >
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          )}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: themeColors.text,
            }}
          >
            Assign Receipts
          </Text>
        </View>
        <Button
          onPress={handleUpload}
          disabled={uploading}
          loading={uploading}
          style={{ paddingVertical: 8, paddingHorizontal: 14 }}
        >
          Upload
        </Button>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <View style={{ marginBottom: 30 }}>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 15,
            }}
          >
            Shared Images ({validImages.length})
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {validImages.map((imageUri: string, index: number) => {
              const assignment = getAssignmentForImage(imageUri);

              if (!assignment) return null;

              const assignedTransaction =
                getTransactionForAssignment(assignment);
              const isSelected = selectedImageIndex === index;

              return (
                <TouchableOpacity
                  key={imageUri}
                  style={{
                    marginRight: 15,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedImageIndex(null);
                    } else if (assignedTransaction) {
                      handleUnassignImage(index);
                      setSelectedImageIndex(index);
                    } else {
                      setSelectedImageIndex(index);
                    }
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: 120,
                        height: 160,
                        borderRadius: 8,
                        backgroundColor: themeColors.card,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: isSelected ? "#ef4444" : palette.primary,
                      }}
                      contentFit="cover"
                    />
                    {assignedTransaction && (
                      <View
                        style={{
                          position: "absolute",
                          top: 5,
                          right: 5,
                          backgroundColor: palette.success,
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
                    {isSelected && (
                      <View
                        style={{
                          position: "absolute",
                          top: 5,
                          left: 5,
                          backgroundColor: "#ef4444",
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="arrow-forward"
                          color="white"
                          size={16}
                        />
                      </View>
                    )}
                  </View>
                  {assignedTransaction && (
                    <Text
                      style={{
                        color: palette.success,
                        fontSize: 12,
                        marginTop: 5,
                        textAlign: "center",
                        maxWidth: 120,
                      }}
                      numberOfLines={2}
                    >
                      {assignedTransaction.memo}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 15,
            }}
          >
            {validTransactions.length > 0 ? (
              <>
                Missing Receipts ({validTransactions.length})
                {selectedImageIndex !== null && (
                  <Text style={{ color: palette.primary, fontSize: 14 }}>
                    {" "}
                    • Tap a transaction or receipt bin to assign the selected
                    image
                  </Text>
                )}
                {validImages.length >= 2 && (
                  <Text style={{ color: palette.info, fontSize: 14 }}>
                    {" "}
                    • Use "Select All" to assign all images to one transaction
                  </Text>
                )}
              </>
            ) : (
              <>
                Receipt Bin Upload
                <Text style={{ color: palette.info, fontSize: 14 }}>
                  {" "}
                  • Images will be uploaded to your receipt bin
                </Text>
              </>
            )}
          </Text>

          {(() => {
            const receiptBinAssignments = assignments.filter(
              (a) => a.isReceiptBin,
            );
            const isSelected = selectedImageIndex !== null;
            const showSelectAll = validImages.length >= 2;

            return (
              <TouchableOpacity
                onPress={() => {
                  if (isSelected && selectedImageIndex !== null) {
                    handleReceiptBinSelect(selectedImageIndex);
                  }
                }}
                disabled={!isSelected}
                style={{
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                <View
                  style={{
                    backgroundColor: themeColors.card,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor:
                      receiptBinAssignments.length > 0
                        ? palette.success
                        : themeColors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.text,
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      Receipt Bin
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 14 }}>
                      Upload to receipt bin
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {receiptBinAssignments.length > 0 && (
                      <View
                        style={{
                          backgroundColor: palette.success,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {receiptBinAssignments.length} receipt
                          {receiptBinAssignments.length > 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}

                    {showSelectAll && (
                      <TouchableOpacity
                        onPress={() => handleReceiptBinSelectAll()}
                        style={{
                          backgroundColor: palette.info,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Select All
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {receiptBinAssignments.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8, marginBottom: 12 }}
                  >
                    {receiptBinAssignments.map((assignment) => (
                      <Image
                        key={assignment.imageUri}
                        source={{ uri: assignment.imageUri }}
                        style={{
                          width: 60,
                          height: 80,
                          borderRadius: 6,
                          marginRight: 8,
                          backgroundColor: themeColors.background,
                        }}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                )}
              </TouchableOpacity>
            );
          })()}

          {validTransactions.map((transaction) => {
            const assignedImages = assignments.filter(
              (a) => a.transactionId === transaction.id,
            );
            const isSelected = selectedImageIndex !== null;
            const showSelectAll = validImages.length >= 2;

            return (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => {
                  if (isSelected && selectedImageIndex !== null) {
                    handleImageSelect(selectedImageIndex, transaction);
                  }
                }}
                disabled={!isSelected}
                style={{
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                <View
                  style={{
                    backgroundColor: themeColors.card,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor:
                      assignedImages.length > 0
                        ? palette.success
                        : themeColors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.text,
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      {transaction.memo}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 14 }}>
                      {renderMoney(Math.abs(transaction.amount_cents))} •{" "}
                      {transaction.organization.name}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {assignedImages.length > 0 && (
                      <View
                        style={{
                          backgroundColor: palette.success,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {assignedImages.length} receipt
                          {assignedImages.length > 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}

                    {showSelectAll && (
                      <TouchableOpacity
                        onPress={() => handleSelectAll(transaction)}
                        style={{
                          backgroundColor: palette.info,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Select All
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {assignedImages.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8, marginBottom: 12 }}
                  >
                    {assignedImages.map((assignment) => (
                      <Image
                        key={assignment.imageUri}
                        source={{ uri: assignment.imageUri }}
                        style={{
                          width: 60,
                          height: 80,
                          borderRadius: 6,
                          marginRight: 8,
                          backgroundColor: themeColors.background,
                        }}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Root-level route: rendered outside `(app)`, but the single `AppSWRConfig` in
// `app/_layout.tsx` sits above both, so invalidations here hit the same cache.
export default ShareIntent;
