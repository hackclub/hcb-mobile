import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import UserMention from "@/components/UserMention";
import User from "@/lib/types/User";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney, statusColor } from "@/utils/util";

interface CheckDepositDetail {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  updated_at: string;
  estimated_arrival_date?: string;
  rejection?: {
    reason: string;
    description?: string;
  };
  front_url?: string;
  back_url?: string;
  submitter: User | null;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors: themeColors } = useTheme();
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

export default function CheckDepositDetailPage() {
  const { id, depositId } = useLocalSearchParams<{
    id: string;
    depositId: string;
  }>();
  const { colors: themeColors } = useTheme();

  const { data: deposit, isLoading } = useOfflineSWR<CheckDepositDetail>(
    `check_deposits/${depositId}`,
  );

  if (isLoading || !deposit) {
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

  const statusLabel = deposit.status.replace(/_/g, " ");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 20,
      }}
    >
      <View style={{ gap: 8 }}>
        <Badge color={statusColor(deposit.status)}>{statusLabel}</Badge>
        <Text
          style={{ fontSize: 32, fontWeight: "700", color: themeColors.text }}
        >
          {renderMoney(deposit.amount_cents)}
        </Text>
      </View>

      {deposit.rejection && (
        <View
          style={{
            backgroundColor: `${palette.primary}20`,
            borderRadius: 12,
            padding: 14,
            gap: 4,
          }}
        >
          <Text
            style={{ color: palette.primary, fontWeight: "700", fontSize: 14 }}
          >
            Rejected: {deposit.rejection.reason.replace(/_/g, " ")}
          </Text>
          {deposit.rejection.description && (
            <Text style={{ color: palette.primary, fontSize: 14 }}>
              {deposit.rejection.description}
            </Text>
          )}
        </View>
      )}

      {(deposit.front_url || deposit.back_url) && (
        <View style={{ gap: 12 }}>
          {deposit.front_url && (
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 13,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Front
              </Text>
              <Image
                source={{ uri: deposit.front_url }}
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 12,
                  backgroundColor: themeColors.card,
                }}
                contentFit="cover"
              />
            </View>
          )}
          {deposit.back_url && (
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 13,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Back
              </Text>
              <Image
                source={{ uri: deposit.back_url }}
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 12,
                  backgroundColor: themeColors.card,
                }}
                contentFit="cover"
              />
            </View>
          )}
        </View>
      )}

      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <DetailRow label="Submitted">
          <Text style={{ color: themeColors.text, fontSize: 15 }}>
            {renderDate(deposit.created_at)}
          </Text>
        </DetailRow>
        {deposit.estimated_arrival_date && (
          <>
            <Divider />
            <DetailRow label="Est. arrival">
              <Text style={{ color: themeColors.text, fontSize: 15 }}>
                {renderDate(deposit.estimated_arrival_date)}
              </Text>
            </DetailRow>
          </>
        )}
        {deposit.submitter && (
          <>
            <Divider />
            <DetailRow label="Submitted by">
              <UserMention user={deposit.submitter} />
            </DetailRow>
          </>
        )}
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(events)/[id]/check-deposits",
            params: { id },
          })
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: themeColors.card,
          borderRadius: 14,
          paddingVertical: 16,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="list-outline" size={18} color={palette.muted} />
        <Text
          style={{ color: themeColors.text, fontSize: 15, fontWeight: "500" }}
        >
          View all deposits
        </Text>
      </Pressable>
    </ScrollView>
  );
}
