import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { mutate as globalMutate } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { parseApiError } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { ReimbursementReport } from "@/lib/types/Reimbursement";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { roleAtLeast } from "@/lib/policies";
import { cardBorderColor, palette, subTextColor } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

export default function EditReportPage() {
  const { id, reportId } = useLocalSearchParams<{
    id: string;
    reportId: string;
  }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();
  const { showActionSheetWithOptions } = useActionSheet();

  const { data: report, mutate: mutateReport } =
    useOfflineSWR<ReimbursementReport>(`reimbursement_reports/${reportId}`);
  const { data: user } = useOfflineSWR<User>("user");
  const { data: org } = useOfflineSWR<Organization | OrganizationExpanded>(
    `organizations/${id}`,
  );
  const { data: userOrgs } = useOfflineSWR<Organization[]>(
    "user/organizations",
  );

  const [name, setName] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!report) return;
    setName(report.name);
    setMaxAmount(
      report.maximum_amount_cents
        ? (report.maximum_amount_cents / 100).toFixed(2)
        : "",
    );
    if (report.reviewer && typeof report.reviewer === "object") {
      setReviewerId(report.reviewer.id);
      setReviewerName(report.reviewer.full_name);
    }
    if (report.organization && typeof report.organization === "object") {
      setOrgId(report.organization.id);
      setOrgName(report.organization.name);
    }
  }, [report]);

  const isAdmin = user?.admin ?? false;
  const isManager =
    isAdmin ||
    (org && "users" in org
      ? roleAtLeast(user ?? null, org as OrganizationExpanded, "manager")
      : false);

  const isCreator =
    report && user
      ? typeof report.user === "object"
        ? report.user.id === user.id
        : report.user === user.id
      : false;

  const isDraft = report?.status === "draft";
  const isOpen = report
    ? !["reimbursement_approved", "reimbursed", "rejected", "reversed"].includes(
        report.status,
      )
    : false;

  const canUpdateName = isManager || (isCreator && isOpen);
  const canUpdateMax = isManager && (isDraft || report?.status === "submitted");
  const canChangeOrg = isManager; // change_event? → admin || manager
  const canSetReviewer = isManager; // set_reviewer? → admin || manager
  const canDelete =
    ((isManager || isCreator) && isDraft) ||
    (isAdmin && report?.status !== "reimbursed");

  const orgMembers =
    org && "users" in org ? (org as OrganizationExpanded).users : [];

  const handlePickReviewer = () => {
    const options = [
      ...orgMembers.map((u) => u.name),
      "Remove reviewer",
      "Cancel",
    ];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: options.length - 2,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: "Assigned reviewer",
      },
      (index) => {
        if (index === undefined) return;
        if (index === options.length - 1) return; // cancel
        if (index === options.length - 2) {
          // remove reviewer
          setReviewerId(null);
          setReviewerName(null);
          return;
        }
        const selected = orgMembers[index];
        setReviewerId(selected.id);
        setReviewerName(selected.name);
      },
    );
  };

  const handlePickOrg = () => {
    if (!userOrgs?.length) return;
    const options = [...userOrgs.map((o) => o.name), "Cancel"];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        userInterfaceStyle: isDark ? "dark" : "light",
        title: "Move report to organization",
      },
      (index) => {
        if (index === undefined || index === options.length - 1) return;
        const selected = userOrgs[index];
        setOrgId(selected.id);
        setOrgName(selected.name);
      },
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Report name required", "Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      const json: Record<string, unknown> = { name: name.trim() };

      if (canUpdateMax) {
        const parsed = parseFloat(maxAmount);
        json.maximum_amount_cents = maxAmount.trim()
          ? Math.round(parsed * 100)
          : null;
      }

      if (canChangeOrg && orgId) {
        const currentOrgId =
          report?.organization && typeof report.organization === "object"
            ? report.organization.id
            : null;
        if (orgId !== currentOrgId) json.organization_id = orgId;
      }

      if (canSetReviewer) {
        const currentReviewerId =
          report?.reviewer && typeof report.reviewer === "object"
            ? report.reviewer.id
            : null;
        if (reviewerId !== currentReviewerId) {
          json.reviewer_id = reviewerId ?? null;
        }
      }

      await hcb
        .patch(`reimbursement_reports/${reportId}`, {
          json: { reimbursement_report: json },
        })
        .json<ReimbursementReport>();
      await mutateReport();
      await globalMutate(`reimbursement_reports?organization_id=${id}`);
      router.back();
    } catch (err) {
      Alert.alert(
        "Failed to update",
        await parseApiError(err, "Please try again."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Report",
      `Delete "${report?.name ?? "this report"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await hcb.delete(`reimbursement_reports/${reportId}`);
              await globalMutate(`reimbursement_reports?organization_id=${id}`);
              router.dismiss(2);
            } catch (err) {
              Alert.alert(
                "Failed to delete",
                await parseApiError(err, "Please try again."),
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const borderColor = cardBorderColor(isDark);
  const subColor = subTextColor(isDark);
  const cardStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor,
  } as const;
  const labelStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: subColor,
    marginBottom: 6,
    marginLeft: 2,
  };

  if (!report) {
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Report name */}
        <View>
          <Text style={labelStyle}>Report name</Text>
          <View style={cardStyle}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Report name"
              placeholderTextColor={subColor}
              style={{
                color: themeColors.text,
                fontSize: 15,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
              editable={canUpdateName}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Reviewer (manager only) */}
        {canSetReviewer && (
          <View>
            <Text style={labelStyle}>Assigned reviewer</Text>
            <Pressable
              onPress={handlePickReviewer}
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
                  color: reviewerName ? themeColors.text : subColor,
                  fontSize: 15,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {reviewerName ?? "None"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={subColor} />
            </Pressable>
          </View>
        )}

        {/* Maximum reimbursable value (manager only) */}
        {canUpdateMax && (
          <View>
            <Text style={labelStyle}>
              Maximum reimbursable value{" "}
              <Text style={{ color: subColor, fontWeight: "400" }}>
                (optional)
              </Text>
            </Text>
            <View
              style={{
                ...cardStyle,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 13,
                gap: 6,
              }}
            >
              <Text
                style={{ color: subColor, fontSize: 17, fontWeight: "500" }}
              >
                $
              </Text>
              <TextInput
                value={maxAmount}
                onChangeText={setMaxAmount}
                placeholder="No limit"
                placeholderTextColor={subColor}
                keyboardType="decimal-pad"
                style={{ color: themeColors.text, fontSize: 15, flex: 1 }}
              />
              {maxAmount.trim() !== "" && (
                <Pressable onPress={() => setMaxAmount("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={subColor} />
                </Pressable>
              )}
            </View>
            {report.maximum_amount_cents !== null && !maxAmount.trim() && (
              <Text
                style={{
                  color: subColor,
                  fontSize: 12,
                  marginTop: 4,
                  marginLeft: 2,
                }}
              >
                Currently {renderMoney(report.maximum_amount_cents)} — clear to
                remove limit
              </Text>
            )}
          </View>
        )}

        {/* Organization (manager only) */}
        {canChangeOrg && (
          <View>
            <Text style={labelStyle}>Organization</Text>
            <Pressable
              onPress={handlePickOrg}
              disabled={!userOrgs?.length}
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
                  color: orgName ? themeColors.text : subColor,
                  fontSize: 15,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {orgName ?? "—"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={subColor} />
            </Pressable>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Button
            onPress={handleSave}
            disabled={saving || !canUpdateName}
            loading={saving}
            style={{ flex: 1 }}
          >
            Update report
          </Button>

          {canDelete && (
            <Button
              variant="outline"
              onPress={handleDelete}
              disabled={deleting}
              loading={deleting}
              style={{ flex: 1 }}
            >
              Delete report
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
