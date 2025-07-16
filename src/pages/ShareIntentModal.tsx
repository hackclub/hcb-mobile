import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import { SafeAreaView } from "react-native-safe-area-context";

import { showAlert } from "../lib/alertUtils";
import useClient from "../lib/client";
import { logCriticalError, logError } from "../lib/errorUtils";
import { StackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import Transaction from "../lib/types/Transaction";
import { palette } from "../theme";
import { renderMoney } from "../util";

type Props = NativeStackScreenProps<StackParamList, "ShareIntentModal">;

interface ImageAssignment {
  imageUri: string;
  transactionId: string | null;
  orgId: string | null;
  isReceiptBin?: boolean;
}

export default function ShareIntentModal({
  route: {
    params: { images, missingTransactions },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();

  const validImages =
    images?.filter((img) => img && typeof img === "string") || [];

  const transactionsRef = useRef<
    Array<Transaction & { organization: Organization }>
  >([]);

  useEffect(() => {
    if (missingTransactions && missingTransactions.length > 0) {
      transactionsRef.current = missingTransactions.filter((t) => t && t.id);
      setTransactionsInitialized(true);
    }
  }, [missingTransactions]);

  const validTransactions = transactionsRef.current;

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
  const [transactionsInitialized, setTransactionsInitialized] = useState(false);

  useEffect(() => {
    if (validImages.length > 0 && assignments.length !== validImages.length) {
      console.log("Syncing assignments array with validImages:", {
        validImagesLength: validImages.length,
        assignmentsLength: assignments.length,
      });
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
    console.log("=== SHARE INTENT MODAL DEBUG ===");
    console.log("Modal opened with params:", {
      imagesCount: validImages.length,
      images: validImages,
      missingTransactionsCount: validTransactions.length,
      transactionsInitialized: transactionsInitialized,
      missingTransactions: validTransactions.map((t) => ({
        id: t.id,
        memo: t.memo,
        amount: t.amount_cents,
        org: t.organization.name,
      })),
    });

    if (validImages.length === 0) {
      console.warn("No valid images provided to ShareIntentModal");
      showAlert(
        "Invalid Share Intent",
        "No valid images were provided. Please try sharing again.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }, [validImages, validTransactions, navigation, transactionsInitialized]);

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    body.append("file", {
      uri: file.uri,
      name: file.fileName || "receipt.jpg",
      type: file.mimeType || "image/jpeg",
    });

    // Only append transaction_id if it's provided (for receipt bin uploads, it won't be)
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

    // If no assignments at all, show error
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

    try {
      // Upload to transactions
      for (const assignment of transactionAssignments) {
        if (!assignment.transactionId || !assignment.orgId) continue;

        await uploadFile(
          {
            uri: assignment.imageUri,
            fileName: `receipt_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
          },
          assignment.orgId,
          assignment.transactionId,
        );
      }

      // Upload to receipt bin
      for (const assignment of receiptBinAssignments) {
        await uploadFile(
          {
            uri: assignment.imageUri,
            fileName: `receipt_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
          },
          "", // No org ID for receipt bin upload
          "", // No transaction ID for receipt bin upload
        );
      }

      const totalUploaded =
        transactionAssignments.length + receiptBinAssignments.length;
      const transactionCount = transactionAssignments.length;
      const receiptBinCount = receiptBinAssignments.length;

      let message = `Successfully uploaded ${totalUploaded} receipt(s).`;
      if (transactionCount > 0 && receiptBinCount > 0) {
        message = `Successfully uploaded ${transactionCount} receipt(s) to transactions and ${receiptBinCount} receipt(s) to receipt bin.`;
      } else if (transactionCount > 0) {
        message = `Successfully uploaded ${transactionCount} receipt(s) to transactions.`;
      } else if (receiptBinCount > 0) {
        message = `Successfully uploaded ${receiptBinCount} receipt(s) to receipt bin.`;
      }

      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "Receipts Uploaded!",
        textBody: message,
      });

      navigation.goBack();
    } catch (error) {
      logCriticalError("Upload error", error, { action: "share_intent_upload" });
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Upload Failed",
        textBody: "Some receipts failed to upload. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const getAssignmentForImage = (imageUri: string) => {
    return assignments.find((a) => a.imageUri === imageUri);
  };

  const getTransactionForAssignment = (assignment: ImageAssignment) => {
    if (!assignment) {
      logError("getTransactionForAssignment called with undefined assignment", new Error("Undefined assignment"), { 
        context: { action: "transaction_assignment" } 
      });
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
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          style={{
            backgroundColor: uploading ? palette.muted : palette.primary,
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
            <Text style={{ color: "white", fontWeight: "600" }}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {/* Images Section */}
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
            {validImages.map((imageUri, index) => {
              const assignment = getAssignmentForImage(imageUri);

              if (!assignment) {
                console.warn(
                  `No assignment found for image ${index}: ${imageUri}`,
                );
                return null;
              }

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
                      // If image is already assigned, unassign it and select it
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

        {/* Missing Transactions Section */}
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

          {/* Receipt Bin Option - Always shown */}
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
                    borderRadius: 12,
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

          {/* Regular Transactions */}
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
                    borderRadius: 12,
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
