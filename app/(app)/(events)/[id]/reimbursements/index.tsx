import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import Badge from "@/components/Badge";
import { Text } from "@/components/Text";
import { parseApiError } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import {
  ReimbursementReport,
  reportStatusColor,
  reportStatusText,
} from "@/lib/types/Reimbursement";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";

interface PaginatedReports {
  data: ReimbursementReport[];
}

export default function ReimbursementsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const navigation = useNavigation();
  const hcb = useClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, mutate } = useOfflineSWR<PaginatedReports>(
    `reimbursement_reports?organization_id=${id}`,
  );
  const reports = data?.data ?? [];

  const isClosed = (r: ReimbursementReport) =>
    ["reimbursement_approved", "reimbursed", "rejected", "reversed"].includes(
      r.status,
    );

  const totalCents = reports.reduce((s, r) => s + r.amount_cents, 0);
  const reimbursedCents = reports
    .filter(
      (r) =>
        r.status === "reimbursed" || r.status === "reimbursement_approved",
    )
    .reduce((s, r) => s + r.amount_cents, 0);
  const pendingCents = reports
    .filter((r) => !isClosed(r))
    .reduce((s, r) => s + r.amount_cents, 0);

  const filtered = search.trim()
    ? reports.filter((r) => {
        const q = search.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const userMatch =
          typeof r.user === "object" &&
          r.user.full_name.toLowerCase().includes(q);
        return nameMatch || userMatch;
      })
    : reports;

  const createReport = useCallback(
    async (name: string) => {
      try {
        const report = await hcb
          .post("reimbursement_reports", {
            json: {
              reimbursement_report: {
                organization_id: id,
                name,
              },
            },
          })
          .json<ReimbursementReport>();
        await mutate();
        router.push({
          pathname: "/(events)/[id]/reimbursements/[reportId]",
          params: { id, reportId: report.id },
        });
      } catch (err) {
        Alert.alert(
          "Failed to create report",
          await parseApiError(err, "Please try again."),
        );
      }
    },
    [hcb, id, mutate],
  );

  const handleCreateReport = useCallback(() => {
    const defaultName = `Expenses from ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    if (Platform.OS === "ios") {
      Alert.prompt(
        "New Report",
        "Enter a name for this reimbursement report",
        (name) => {
          if (name?.trim()) createReport(name.trim());
        },
        "plain-text",
        defaultName,
      );
    } else {
      createReport(defaultName);
    }
  }, [createReport]);

  useEffect(() => {
    navigation.setOptions({
      title: "Reimbursements",
      headerRight: () => (
        <Pressable
          onPress={handleCreateReport}
          style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
          accessibilityLabel="New reimbursement report"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={26} color={themeColors.text} />
        </Pressable>
      ),
    });
  }, [navigation, handleCreateReport, themeColors.text]);

  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  const searchBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 16,
      }}
    >
      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 32 }}>
          <ActivityIndicator />
        </View>
      )}

      {!isLoading && reports.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
          <Ionicons name="receipt-outline" size={48} color={palette.muted} />
          <Text
            style={{ color: palette.muted, fontSize: 15, textAlign: "center" }}
          >
            No reimbursement reports yet.{"\n"}Tap + to create one.
          </Text>
        </View>
      )}

      {reports.length > 0 && (
        <>
          {/* Stats bar */}
          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <View style={{ flexDirection: "row", paddingVertical: 14 }}>
              <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 11,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Total
                </Text>
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  {renderMoney(totalCents)}
                </Text>
              </View>
              <View
                style={{
                  width: 1,
                  backgroundColor: themeColors.border,
                  marginVertical: 2,
                }}
              />
              <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 11,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Reimbursed
                </Text>
                <Text
                  style={{
                    color: "#33a854",
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  {renderMoney(reimbursedCents)}
                </Text>
              </View>
              <View
                style={{
                  width: 1,
                  backgroundColor: themeColors.border,
                  marginVertical: 2,
                }}
              />
              <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 11,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Pending
                </Text>
                <Text
                  style={{
                    color: "#f5a623",
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  {renderMoney(pendingCents)}
                </Text>
              </View>
            </View>
          </View>

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: searchBg,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 9,
              gap: 8,
            }}
          >
            <Ionicons name="search" size={16} color={subColor} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search reports..."
              placeholderTextColor={subColor}
              style={{ flex: 1, color: themeColors.text, fontSize: 15 }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Report list */}
          {filtered.length === 0 ? (
            <Text
              style={{
                color: palette.muted,
                fontSize: 14,
                textAlign: "center",
                paddingTop: 8,
              }}
            >
              No reports match your search.
            </Text>
          ) : (
            <View
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {filtered.map((report, index) => {
                const userName =
                  typeof report.user === "object"
                    ? report.user.full_name
                    : null;
                const statusColor = reportStatusColor(report.status);
                const dateStr = renderDate(
                  report.submitted_at ??
                    report.reimbursement_approved_at ??
                    report.reimbursed_at ??
                    report.created_at,
                );

                return (
                  <View key={report.id}>
                    {index > 0 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: themeColors.border,
                          marginHorizontal: 16,
                        }}
                      />
                    )}
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname:
                            "/(events)/[id]/reimbursements/[reportId]",
                          params: { id, reportId: report.id },
                        })
                      }
                      style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        gap: 6,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: themeColors.text,
                            fontSize: 15,
                            fontWeight: "600",
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {report.name}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.text,
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          {renderMoney(report.amount_cents)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Badge color={statusColor}>
                          {reportStatusText(report.status)}
                        </Badge>
                        {userName && (
                          <Text
                            style={{ color: palette.muted, fontSize: 13 }}
                            numberOfLines={1}
                          >
                            · {userName}
                          </Text>
                        )}
                        <Text
                          style={{
                            color: palette.muted,
                            fontSize: 13,
                            marginLeft: "auto",
                          }}
                        >
                          {dateStr}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          <Text
            style={{
              color: palette.muted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Displaying all {filtered.length} report
            {filtered.length !== 1 ? "s" : ""}.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
