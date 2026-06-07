import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Image } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { mutate } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/lib/types/Reimbursement";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

type ReceiptImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
} | null;

export default function NewExpensePage() {
  const { id, reportId } = useLocalSearchParams<{
    id: string;
    reportId: string;
  }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();
  const { showActionSheetWithOptions } = useActionSheet();

  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState<ReceiptImage>(null);
  const [submitting, setSubmitting] = useState(false);

  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

  const cardStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor,
  } as const;

  const labelStyle = {
    fontSize: 12,
    fontWeight: "600" as const,
    color: subColor,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  };

  const pickReceipt = () => {
    showActionSheetWithOptions(
      {
        options: ["Take Photo", "Choose from Library", "Cancel"],
        cancelButtonIndex: 2,
        userInterfaceStyle: isDark ? "dark" : "light",
      },
      async (index) => {
        if (index === 0) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            showAlert(
              "Permission needed",
              "Camera access is required to take photos.",
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            setReceipt({
              uri: asset.uri,
              fileName: asset.fileName ?? "receipt.jpg",
              mimeType: asset.mimeType ?? "image/jpeg",
            });
          }
        } else if (index === 1) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            setReceipt({
              uri: asset.uri,
              fileName: asset.fileName ?? "receipt.jpg",
              mimeType: asset.mimeType ?? "image/jpeg",
            });
          }
        }
      },
    );
  };

  const pickCategory = () => {
    const options = [...EXPENSE_CATEGORIES, "Cancel"];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: "Select Category",
      },
      (index) => {
        if (index !== undefined && index < EXPENSE_CATEGORIES.length) {
          setCategory(EXPENSE_CATEGORIES[index]);
        }
      },
    );
  };

  const handleSubmit = async () => {
    if (!memo.trim()) {
      showAlert("Memo required", "Please enter a description for this expense.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert("Invalid amount", "Please enter a valid expense amount.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("reimbursement_expense[memo]", memo.trim());
      body.append("reimbursement_expense[value]", String(parsedAmount));
      if (category) {
        body.append("reimbursement_expense[category]", category);
      }
      if (description.trim()) {
        body.append("reimbursement_expense[description]", description.trim());
      }

      if (receipt) {
        const compressed = await manipulateAsync(receipt.uri, [], {
          compress: 0.85,
          format: SaveFormat.JPEG,
        });
        body.append("receipt", {
          uri: compressed.uri,
          name: "receipt.jpeg",
          type: "image/jpeg",
        } as unknown as Blob);
      }

      await hcb
        .post(`reimbursement_expenses`, { body })
        .json();

      await mutate(`reimbursement_expenses?report_id=${reportId}`);
      await mutate(`reimbursement_reports/${reportId}`);

      router.back();
    } catch (err) {
      Alert.alert(
        "Failed to add expense",
        await parseApiError(err, "Please check your details and try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt */}
        <View>
          <Text style={labelStyle}>Receipt</Text>
          <Pressable
            onPress={pickReceipt}
            style={({ pressed }) => ({
              height: 140,
              borderRadius: 14,
              borderWidth: receipt ? 0 : 2,
              borderColor: isDark
                ? "rgba(255,255,255,0.2)"
                : "rgba(0,0,0,0.15)",
              borderStyle: receipt ? undefined : "dashed",
              overflow: "hidden",
              opacity: pressed ? 0.7 : 1,
              backgroundColor: receipt
                ? "transparent"
                : isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
            })}
          >
            {receipt ? (
              <>
                <Image
                  source={{ uri: receipt.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                  >
                    Tap to change
                  </Text>
                </View>
              </>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={28}
                  color={palette.muted}
                />
                <Text style={{ color: palette.muted, fontSize: 14 }}>
                  Tap to add receipt
                </Text>
                <Text
                  style={{ color: subColor, fontSize: 12, textAlign: "center" }}
                >
                  Required before submitting your report
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Memo */}
        <View>
          <Text style={labelStyle}>
            Memo <Text style={{ color: palette.primary }}>*</Text>
          </Text>
          <View
            style={{
              ...cardStyle,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="What was this expense for?"
              placeholderTextColor={subColor}
              style={{ color: themeColors.text, fontSize: 15 }}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Amount */}
        <View>
          <Text style={labelStyle}>
            Amount (USD) <Text style={{ color: palette.primary }}>*</Text>
          </Text>
          <View
            style={{
              ...cardStyle,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 6,
            }}
          >
            <Text
              style={{ color: subColor, fontSize: 17, fontWeight: "500" }}
            >
              $
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={subColor}
              keyboardType="decimal-pad"
              style={{ color: themeColors.text, fontSize: 17, flex: 1 }}
            />
          </View>
        </View>

        {/* Category */}
        <View>
          <Text style={labelStyle}>Category</Text>
          <Pressable
            onPress={pickCategory}
            style={({ pressed }) => ({
              ...cardStyle,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 13,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: category ? themeColors.text : subColor,
                fontSize: 15,
              }}
            >
              {category ?? "Select a category (optional)"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={subColor} />
          </Pressable>
        </View>

        {/* Description */}
        <View>
          <Text style={labelStyle}>Description</Text>
          <View
            style={{
              ...cardStyle,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Additional details (optional)"
              placeholderTextColor={subColor}
              multiline
              numberOfLines={3}
              style={{
                color: themeColors.text,
                fontSize: 15,
                minHeight: 64,
                textAlignVertical: "top",
              }}
            />
          </View>
        </View>

        <Button variant="primary" loading={submitting} onPress={handleSubmit}>
          Add Expense
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
