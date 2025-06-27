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
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import { SafeAreaView } from "react-native-safe-area-context";

import useClient from "../lib/client";
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
}

export default function ShareIntentModal({
  route: {
    params: { images, missingTransactions },
  },
  navigation,
}: Props) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();

  // Validate params to prevent errors from invalid state
  const validImages =
    images?.filter((img) => img && typeof img === "string") || [];
  const validTransactions = missingTransactions?.filter((t) => t && t.id) || [];

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

  // Debug logging
  useEffect(() => {
    console.log("=== SHARE INTENT MODAL DEBUG ===");
    console.log("Modal opened with params:", {
      imagesCount: validImages.length,
      images: validImages,
      missingTransactionsCount: validTransactions.length,
      missingTransactions: validTransactions.map((t) => ({
        id: t.id,
        memo: t.memo,
        amount: t.amount_cents,
        org: t.organization.name,
      })),
    });

    // Handle invalid state
    if (validImages.length === 0) {
      console.warn("No valid images provided to ShareIntentModal");
      Alert.alert(
        "Invalid Share Intent",
        "No valid images were provided. Please try sharing again.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }, [validImages, validTransactions, navigation]);

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
    setSelectedImageIndex(null); // Close selection mode
  };

  const handleSelectAll = (
    transaction: Transaction & { organization: Organization },
  ) => {
    setAssignments((prev) =>
      prev.map((assignment) => ({
        imageUri: assignment.imageUri,
        transactionId: transaction.id,
        orgId: transaction.organization.id,
      })),
    );
    setSelectedImageIndex(null); // Close selection mode
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

    await hcb.post(
      `organizations/${orgId}/transactions/${transactionId}/receipts`,
      {
        body,
      },
    );
  };

  const handleUpload = async () => {
    const validAssignments = assignments.filter(
      (a) => a.transactionId && a.orgId,
    );

    if (validAssignments.length === 0) {
      Alert.alert(
        "No Assignments",
        "Please assign at least one image to a transaction before uploading.",
      );
      return;
    }

    setUploading(true);

    try {
      for (const assignment of validAssignments) {
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

      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "Receipts Uploaded!",
        textBody: `Successfully uploaded ${validAssignments.length} receipt(s).`,
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
    }
  };

  const getAssignmentForImage = (imageUri: string) => {
    return assignments.find((a) => a.imageUri === imageUri);
  };

  const getTransactionForAssignment = (assignment: ImageAssignment) => {
    if (!assignment.transactionId) return null;
    return validTransactions.find((t) => t.id === assignment.transactionId);
  };

  // Early return if no valid images
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
            <Text style={{ color: "white", fontWeight: "600" }}>
              Upload
            </Text>
          ) }
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
              const assignedTransaction = getTransactionForAssignment(
                assignment!,
              );
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
                        borderColor: palette.primary,
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
                          backgroundColor: palette.primary,
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
            Missing Receipts ({validTransactions.length})
            {selectedImageIndex !== null && (
              <Text style={{ color: palette.primary, fontSize: 14 }}>
                {" "}
                • Tap a transaction to assign the selected image
              </Text>
            )}
            {validImages.length >= 2 && (
              <Text style={{ color: palette.info, fontSize: 14 }}>
                {" "}
                • Use "Select All" to assign all images to one transaction
              </Text>
            )}
          </Text>

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
