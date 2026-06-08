import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney, statusColor } from "@/utils/format";

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
  const { data: deposits, isLoading } = useOfflineSWR<CheckDepositsResponse>(
    `check_deposits?organization_id=${id}`,
  );

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
      <Button
        onPress={() =>
          router.push({
            pathname: "/(events)/[id]/check-deposits/new",
            params: { id },
          })
        }
        icon="plus"
        iconSize={24}
      >
        Deposit a check
      </Button>
      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}
      {!isLoading && deposits && deposits?.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
          <Ionicons name="document-outline" size={40} color={palette.muted} />
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            No check deposits yet
          </Text>
        </View>
      )}
      {deposits && deposits.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 8,
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
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Badge color={statusColor(deposit.status)}>
                    {deposit.status.replace(/_/g, " ")}
                  </Badge>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={palette.muted}
                  />
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
