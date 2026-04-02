import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import { Text } from "components/Text";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney, statusColor } from "@/utils/util";

interface CheckDepositSummary {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
}

interface CheckDepositsResponse {
  data: CheckDepositSummary[];
}

export default function CheckDepositsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();

  const { data, isLoading } = useOfflineSWR<CheckDepositsResponse>(
    `organizations/${id}/check_deposits`,
  );

  const deposits = data?.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 16,
      }}
    >
      {/* New deposit button */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(events)/[id]/check-deposits/new",
            params: { id },
          })
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: palette.primary,
          borderRadius: 14,
          paddingVertical: 16,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
          Deposit a check
        </Text>
      </Pressable>

      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}

      {!isLoading && deposits.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
          <Ionicons name="document-outline" size={40} color={palette.muted} />
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            No check deposits yet
          </Text>
        </View>
      )}

      {deposits.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {deposits.map((deposit, index) => (
            <View key={deposit.id}>
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
                    pathname: "/(events)/[id]/check-deposits/[depositId]",
                    params: { id, depositId: deposit.id },
                  })
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ gap: 4, flex: 1 }}>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {renderMoney(deposit.amount_cents)}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 13 }}>
                    {renderDate(deposit.created_at)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Badge color={statusColor(deposit.status)}>
                    {deposit.status.replace(/_/g, " ")}
                  </Badge>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
