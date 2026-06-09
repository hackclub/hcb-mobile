import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ComponentRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import ImageView from "react-native-image-viewing";
import { mutate as globalMutate } from "swr";

import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import {
  Receipt,
  ReimbursementExpense,
  ReimbursementReport,
  reportStatusColor,
  reportStatusText,
} from "@/lib/types/Reimbursement";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";

interface PaginatedExpenses {
  data: ReimbursementExpense[];
}

interface ViewerState {
  receipts: Receipt[];
  index: number;
  expenseId: string;
}

function StatusBanner({
  color,
  icon,
  children,
}: {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: string;
}) {
  return (
    <View
      style={{
        backgroundColor: `${color}20`,
        borderRadius: 8,
        padding: 14,
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: 14, flex: 1, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}

function Divider() {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: themeColors.border,
        marginHorizontal: 16,
      }}
    />
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 15 }}>{label}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}

function ExpenseReceiptsSection({
  expense,
  isDraft,
  onOpenViewer,
}: {
  expense: ReimbursementExpense;
  isDraft: boolean;
  onOpenViewer: (receipts: Receipt[], index: number) => void;
}) {
  const hcb = useClient();
  const isDark = useIsDark();
  const { showActionSheetWithOptions } = useActionSheet();
  const [uploading, setUploading] = useState(false);

  const { data: receipts, mutate: mutateReceipts } = useOfflineSWR<Receipt[]>(
    `receipts?expense_id=${expense.id}`,
  );
  const receiptList = receipts ?? [];

  const uploadReceipt = async (uri: string) => {
    setUploading(true);
    try {
      const compressed = await manipulateAsync(uri, [], {
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      const body = new FormData();
      body.append("receipt", {
        uri: compressed.uri,
        name: "receipt.jpeg",
        type: "image/jpeg",
      } as unknown as Blob);
      await hcb.patch(`reimbursement_expenses/${expense.id}`, { body }).json();
      await mutateReceipts();
    } catch (err) {
      Alert.alert(
        "Upload failed",
        await parseApiError(err, "Please try again."),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddReceipt = () => {
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
            showAlert("Permission needed", "Camera access is required.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) await uploadReceipt(result.assets[0].uri);
        } else if (index === 1) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) await uploadReceipt(result.assets[0].uri);
        }
      },
    );
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    Alert.alert("Delete receipt?", receipt.filename, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hcb.delete(`receipts/${receipt.id}`);
            await mutateReceipts();
          } catch (err) {
            Alert.alert(
              "Delete failed",
              await parseApiError(err, "Please try again."),
            );
          }
        },
      },
    ]);
  };

  if (receiptList.length === 0 && !isDraft) return null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {receiptList.map((receipt, i) => (
          <Pressable
            key={receipt.id}
            onPress={() => onOpenViewer(receiptList, i)}
            onLongPress={
              isDraft ? () => handleDeleteReceipt(receipt) : undefined
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Image
              source={{ uri: receipt.preview_url }}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                backgroundColor: palette.muted + "30",
              }}
              contentFit="cover"
            />
            {isDraft && (
              <Pressable
                onPress={() => handleDeleteReceipt(receipt)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: palette.primary,
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                hitSlop={6}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            )}
          </Pressable>
        ))}

        {isDraft && (
          <Pressable
            onPress={handleAddReceipt}
            disabled={uploading}
            style={({ pressed }) => ({
              width: 72,
              height: 72,
              borderRadius: 10,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: palette.muted + "80",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              opacity: pressed || uploading ? 0.5 : 1,
            })}
          >
            {uploading ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={palette.muted}
                />
                <Text style={{ color: palette.muted, fontSize: 10 }}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function DeleteAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      style={{
        backgroundColor: "#ec3750",
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        gap: 4,
      }}
    >
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
        Delete
      </Text>
    </Pressable>
  );
}

function ExpenseRow({
  expense,
  isDraft,
  onDelete,
  onOpenViewer,
}: {
  expense: ReimbursementExpense;
  isDraft: boolean;
  onDelete: () => void;
  onOpenViewer: (receipts: Receipt[], index: number) => void;
}) {
  const { colors: themeColors } = useTheme();
  const swipeableRef = useRef<ComponentRef<typeof ReanimatedSwipeable>>(null);
  const expenseColor =
    expense.status === "approved" ? "#33a854" : palette.muted;

  const handleDelete = () => {
    Alert.alert("Delete expense?", expense.memo ?? "This expense", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => swipeableRef.current?.close(),
      },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const inner = (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ color: themeColors.text, fontSize: 15, fontWeight: "500" }}
            numberOfLines={1}
          >
            {expense.memo ?? "Untitled expense"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {expense.category && (
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                {expense.category} ·{" "}
              </Text>
            )}
            <Badge color={expenseColor}>
              {expense.status === "approved" ? "Approved" : "Pending"}
            </Badge>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{ color: themeColors.text, fontSize: 15, fontWeight: "600" }}
          >
            {renderMoney(expense.amount_cents)}
          </Text>
        </View>
      </View>
      <ExpenseReceiptsSection
        expense={expense}
        isDraft={isDraft}
        onOpenViewer={onOpenViewer}
      />
    </View>
  );

  if (!isDraft) return inner;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={() => <DeleteAction onDelete={handleDelete} />}
      rightThreshold={40}
      overshootRight={false}
    >
      {inner}
    </ReanimatedSwipeable>
  );
}

export default function ReportDetailPage() {
  const { id, reportId } = useLocalSearchParams<{
    id: string;
    reportId: string;
  }>();
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const hcb = useClient();
  const isDark = useIsDark();
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);

  const {
    data: report,
    isLoading: reportLoading,
    mutate: mutateReport,
  } = useOfflineSWR<ReimbursementReport>(`reimbursement_reports/${reportId}`);

  const {
    data: expensesData,
    isLoading: expensesLoading,
    mutate: mutateExpenses,
  } = useOfflineSWR<PaginatedExpenses>(
    `reimbursement_expenses?report_id=${reportId}`,
  );
  const expenses = expensesData?.data ?? [];

  const isDraft = report?.status === "draft";
  const isLocked =
    report?.status === "submitted" ||
    report?.status === "reimbursement_requested";

  const handleOpenSettings = () =>
    router.push({
      pathname: "/(events)/[id]/reimbursements/[reportId]/edit-report",
      params: { id, reportId },
    });

  const handleDeleteReport = () => {
    Alert.alert("Delete Report", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hcb.delete(`reimbursement_reports/${reportId}`);
            await globalMutate(`reimbursement_reports?organization_id=${id}`);
            router.back();
          } catch (err) {
            Alert.alert(
              "Failed to delete",
              await parseApiError(err, "Please try again."),
            );
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!report) return;
    navigation.setOptions({
      title: report.name,
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => ({
              padding: 8,
              opacity: pressed ? 0.6 : 1,
            })}
            accessibilityLabel="Edit report"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={themeColors.text}
            />
          </Pressable>
          {isDraft && (
            <Pressable
              onPress={handleDeleteReport}
              style={({ pressed }) => ({
                padding: 8,
                opacity: pressed ? 0.6 : 1,
              })}
              accessibilityLabel="Delete report"
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={palette.primary}
              />
            </Pressable>
          )}
        </View>
      ),
    });
  }, [report, navigation, isDraft, themeColors.text]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([mutateReport(), mutateExpenses()]);
    } finally {
      setRefreshing(false);
    }
  };

  const goToNewExpense = () =>
    router.push({
      pathname: "/(events)/[id]/reimbursements/[reportId]/new-expense",
      params: { id, reportId },
    });

  const handleSubmit = async () => {
    if (!report) return;
    Alert.alert(
      "Submit Report",
      `Submit "${report.name}" with ${expenses.length} expense${expenses.length !== 1 ? "s" : ""} for ${renderMoney(report.amount_cents)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            try {
              await hcb.post(`reimbursement_reports/${reportId}/submit`);
              await mutateReport();
              await globalMutate(`reimbursement_reports?organization_id=${id}`);
            } catch (err) {
              Alert.alert(
                "Submission failed",
                await parseApiError(
                  err,
                  "Make sure all expenses have receipts and you have a payout method set up.",
                ),
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleReturnToDraft = async () => {
    Alert.alert(
      "Return to Draft",
      "This will allow you to make changes to your report.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Return to Draft",
          onPress: async () => {
            setSubmitting(true);
            try {
              await hcb.post(`reimbursement_reports/${reportId}/draft`);
              await mutateReport();
              await globalMutate(`reimbursement_reports?organization_id=${id}`);
            } catch (err) {
              Alert.alert(
                "Failed",
                await parseApiError(err, "Please try again."),
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await hcb.delete(`reimbursement_expenses/${expenseId}`);
      await mutateExpenses();
      await mutateReport();
    } catch (err) {
      Alert.alert(
        "Failed to delete",
        await parseApiError(err, "Please try again."),
      );
    }
  };

  const handleDeleteViewedReceipt = async () => {
    if (!viewerState) return;
    const receipt = viewerState.receipts[viewerState.index];
    Alert.alert("Delete receipt?", receipt.filename, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hcb.delete(`receipts/${receipt.id}`);
            setViewerState(null);
            await globalMutate(`receipts?expense_id=${viewerState.expenseId}`);
          } catch (err) {
            Alert.alert(
              "Delete failed",
              await parseApiError(err, "Please try again."),
            );
          }
        },
      },
    ]);
  };

  if (reportLoading && !report) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!report) return null;

  const statusColor = reportStatusColor(report.status);
  const canSubmit = isDraft && expenses.length > 0;
  const userName =
    typeof report.user === "object"
      ? (report.user.full_name ?? report.user.name)
      : null;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: themeColors.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero: status + amount */}
        <View style={{ gap: 8 }}>
          <Badge color={statusColor}>{reportStatusText(report.status)}</Badge>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 32,
              fontWeight: "700",
              letterSpacing: -0.5,
            }}
          >
            {renderMoney(report.amount_cents)}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            {expenses.length === 0
              ? "No expenses yet"
              : `across ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
            {report.maximum_amount_cents
              ? ` · cap ${renderMoney(report.maximum_amount_cents)}`
              : ""}
          </Text>
          {userName && (
            <Text style={{ color: palette.muted, fontSize: 14, marginTop: 2 }}>
              Submitted by{" "}
              <Text style={{ color: themeColors.text, fontWeight: "600" }}>
                {userName}
              </Text>
            </Text>
          )}
        </View>

        {/* Draft instruction */}
        {isDraft && (
          <View
            style={{
              backgroundColor: `${palette.primary}15`,
              borderRadius: 8,
              padding: 14,
              gap: 4,
            }}
          >
            <Text
              style={{
                color: palette.primary,
                fontWeight: "700",
                fontSize: 14,
              }}
            >
              Paid for something out of pocket?
            </Text>
            <Text
              style={{ color: palette.primary, fontSize: 14, lineHeight: 20 }}
            >
              Get reimbursed by uploading your receipts. Add an expense below —
              each one needs a memo, amount, and receipt.
            </Text>
          </View>
        )}

        {/* Status banners */}
        {report.status === "submitted" && (
          <StatusBanner color="#338eda" icon="time-outline">
            Your report has been submitted and is awaiting review.
          </StatusBanner>
        )}

        {report.status === "reimbursement_requested" && (
          <StatusBanner color="#9a5fd4" icon="hourglass-outline">
            The HCB team is processing your reimbursement. This typically takes
            up to 2 business days.
          </StatusBanner>
        )}

        {(report.status === "reimbursement_approved" ||
          report.status === "reimbursed") && (
          <StatusBanner color="#33a854" icon="checkmark-circle-outline">
            {report.status === "reimbursed"
              ? "Your reimbursement has been sent."
              : "Approved! Your reimbursement is on its way."}
          </StatusBanner>
        )}

        {report.status === "rejected" && (
          <StatusBanner color={palette.primary} icon="close-circle-outline">
            This report was rejected.
          </StatusBanner>
        )}

        {/* Expenses */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: palette.muted,
              fontSize: 13,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              marginLeft: 2,
            }}
          >
            Expenses
          </Text>

          {expensesLoading && !expensesData && (
            <View style={{ alignItems: "center", paddingTop: 16 }}>
              <ActivityIndicator />
            </View>
          )}

          {!expensesLoading && expenses.length === 0 && (
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 8,
                padding: 24,
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: cardBorderColor(isDark),
              }}
            >
              <Ionicons
                name="receipt-outline"
                size={28}
                color={palette.muted}
              />
              <Text style={{ color: palette.muted, fontSize: 14 }}>
                {isDraft
                  ? "Get started by adding an expense."
                  : "No expenses in this report."}
              </Text>
            </View>
          )}

          {expenses.length > 0 && (
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 8,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: cardBorderColor(isDark),
              }}
            >
              {expenses.map((expense, index) => (
                <View key={expense.id}>
                  {index > 0 && <Divider />}
                  <ExpenseRow
                    expense={expense}
                    isDraft={isDraft ?? false}
                    onDelete={() => handleDeleteExpense(expense.id)}
                    onOpenViewer={(receipts, i) =>
                      setViewerState({
                        receipts,
                        index: i,
                        expenseId: expense.id,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Draft actions */}
        {isDraft && (
          <View style={{ gap: 10 }}>
            <Button onPress={goToNewExpense} icon="plus" iconSize={24}>
              Add standard expense
            </Button>

            <Button
              variant="secondary"
              onPress={canSubmit ? handleSubmit : undefined}
              disabled={!canSubmit || submitting}
              loading={submitting}
            >
              Submit & request review
            </Button>

            {!canSubmit && (
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Add at least one expense to submit
              </Text>
            )}
          </View>
        )}

        {/* Return to draft */}
        {isLocked && (
          <Button
            variant="secondary"
            onPress={handleReturnToDraft}
            disabled={submitting}
            loading={submitting}
          >
            Return to Draft
          </Button>
        )}

        {/* Timeline */}
        {(report.submitted_at ||
          report.reimbursement_requested_at ||
          report.reimbursement_approved_at ||
          report.reimbursed_at ||
          report.rejected_at) && (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: palette.muted,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginLeft: 2,
              }}
            >
              Timeline
            </Text>
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {[
                { label: "Submitted", date: report.submitted_at },
                {
                  label: "Reimbursement Requested",
                  date: report.reimbursement_requested_at,
                },
                {
                  label: "Approved",
                  date: report.reimbursement_approved_at,
                },
                { label: "Reimbursed", date: report.reimbursed_at },
                { label: "Rejected", date: report.rejected_at },
              ]
                .filter(({ date }) => !!date)
                .map(({ label, date }, index) => (
                  <View key={label}>
                    {index > 0 && <Divider />}
                    <DetailRow label={label}>
                      <Text style={{ color: themeColors.text, fontSize: 15 }}>
                        {renderDate(date!)}
                      </Text>
                    </DetailRow>
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full-screen image viewer */}
      <ImageView
        images={
          viewerState?.receipts.map((r) => ({ uri: r.preview_url })) ?? []
        }
        imageIndex={viewerState?.index ?? 0}
        visible={viewerState !== null}
        onRequestClose={() => setViewerState(null)}
        presentationStyle="fullScreen"
        FooterComponent={
          isDraft && viewerState
            ? () => (
                <View
                  style={{
                    paddingBottom: 40,
                    paddingHorizontal: 20,
                    alignItems: "center",
                  }}
                >
                  <Pressable
                    onPress={handleDeleteViewedReceipt}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(255,0,0,0.15)",
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 20,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff3b30" />
                    <Text
                      style={{
                        color: "#ff3b30",
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      Delete Receipt
                    </Text>
                  </Pressable>
                </View>
              )
            : undefined
        }
      />
    </>
  );
}
