import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import { Text } from "@/components/Text";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney, statusColor } from "@/utils/format";

interface CheckDepositSummary {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
}

export default function CheckDepositsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const { data: deposits, isLoading } = useOfflineSWR<CheckDepositSummary[]>(
    `check_deposits?organization_id=${id}`,
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(events)/[id]/check-deposits/new",
              params: { id },
            })
          }
          style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
          accessibilityLabel="Deposit a check"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={26} color={themeColors.text} />
        </Pressable>
      ),
    });
  }, [navigation, id, themeColors.text]);

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
      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}
      {!isLoading && deposits && deposits?.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
          <Ionicons name="document-outline" size={40} color={palette.muted} />
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            No check deposits yet. Tap + to deposit one.
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
