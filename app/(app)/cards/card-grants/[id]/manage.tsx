import Icon from "@thedev132/hackclub-icons-rn";
import { format } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ComponentProps, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSWRConfig } from "swr";

import { Text } from "@/components/Text";
import useClient from "@/lib/client";
import { CardGrantPolicy } from "@/lib/policies";
import Card from "@/lib/types/Card";
import GrantCardType from "@/lib/types/GrantCard";
import { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette, subTextColor } from "@/styles/theme";
import {
  handleOneTimeUse,
  handleSetPurpose,
  handleTopup,
  handleWithdraw,
} from "@/utils/cardActions";
import { renderMoney } from "@/utils/format";
import { formatCategoryNames, formatMerchantNames } from "@/utils/org";

function AmountStat({ label, value }: { label: string; value: number }) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: subTextColor(isDark),
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{ fontSize: 26, fontWeight: "700", color: themeColors.text }}
      >
        {renderMoney(value)}
      </Text>
    </View>
  );
}

function TintButton({
  icon,
  label,
  backgroundColor,
  color,
  loading,
  onPress,
}: {
  icon: ComponentProps<typeof Icon>["glyph"];
  label: string;
  backgroundColor: string;
  color: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor,
        borderRadius: 8,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon glyph={icon} size={20} color={color} />
      )}
      <Text style={{ fontSize: 16, fontWeight: "600", color }}>{label}</Text>
    </Pressable>
  );
}

function InlineForm({
  value,
  onChangeText,
  placeholder,
  amount,
  confirmLabel,
  confirmColor,
  confirmTextColor,
  confirmDisabled,
  loading,
  onCancel,
  onConfirm,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  amount?: boolean;
  confirmLabel: string;
  confirmColor: string;
  confirmTextColor: string;
  confirmDisabled?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const buttonStyle = {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 8,
    paddingVertical: 12,
  };

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: themeColors.text,
          ...(amount && { fontFamily: "JetBrainsMono-Regular" }),
        }}
        placeholder={placeholder}
        placeholderTextColor={subTextColor(isDark)}
        keyboardType={amount ? "decimal-pad" : "default"}
        value={value}
        onChangeText={onChangeText}
        autoFocus
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={({ pressed }) => [
            buttonStyle,
            {
              backgroundColor: themeColors.card,
              borderWidth: 1,
              borderColor: cardBorderColor(isDark),
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: themeColors.text }}
          >
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={loading || confirmDisabled}
          style={({ pressed }) => [
            buttonStyle,
            {
              backgroundColor: confirmColor,
              opacity: confirmDisabled ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={confirmTextColor} />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: confirmTextColor,
              }}
            >
              {confirmLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const isDark = useIsDark();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 16, color: subTextColor(isDark) }}>{label}</Text>
      <Text
        style={{
          fontSize: 16,
          color: palette.muted,
          fontWeight: "500",
          fontFamily: "JetBrainsMono-Regular",
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ManageGrantPage() {
  const { id: grantId } = useLocalSearchParams<{ id: string }>();
  const fullGrantId = grantId.startsWith("cdg_") ? grantId : `cdg_${grantId}`;
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();
  const { mutate } = useSWRConfig();

  const grantKey = `card_grants/${fullGrantId}?expand=balance_cents`;
  const { data: grantCard } = useOfflineSWR<GrantCardType>(grantKey);
  const { data: user } = useOfflineSWR<User>(`user`);
  const { data: card } = useOfflineSWR<Card>(
    grantCard?.card_id ? `cards/${grantCard.card_id}` : null,
  );
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    card?.organization.id ? `organizations/${card.organization.id}` : null,
  );

  const grantPolicy =
    grantCard && organization
      ? new CardGrantPolicy(user ?? null, grantCard, organization)
      : null;

  const [expanded, setExpanded] = useState<
    "topup" | "withdraw" | "purpose" | null
  >(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [purposeText, setPurposeText] = useState("");
  const [isSettingPurpose, setIsSettingPurpose] = useState(false);
  const [isOneTimeUse, setIsOneTimeUse] = useState(false);

  // handlers close their "modal" on success — collapse the inline form
  const collapse = (show: boolean) => {
    if (!show) setExpanded(null);
  };

  const isValidAmount = (value: string) =>
    !isNaN(parseFloat(value)) && parseFloat(value) > 0;

  // action handlers revalidate the bare card_grants key; this screen reads
  // the expanded one
  const reloadGrant = () => mutate(grantKey);

  if (!grantCard) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const canTopup =
    grantPolicy?.topup() &&
    card?.status !== "canceled" &&
    card?.status !== "expired";
  const canWithdraw = grantPolicy?.withdraw() && card?.status !== "canceled";

  const sectionStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cardBorderColor(isDark),
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          sectionStyle,
          { flexDirection: "row", paddingVertical: 20, paddingHorizontal: 16 },
        ]}
      >
        <AmountStat label="Initial amount" value={grantCard.amount_cents} />
        <AmountStat label="Balance remaining" value={grantCard.balance_cents} />
      </View>

      {expanded === "topup" ? (
        <InlineForm
          value={topupAmount}
          onChangeText={setTopupAmount}
          placeholder="500.00"
          amount
          confirmLabel="Topup"
          confirmColor="#50ECC0"
          confirmTextColor="#114F3D"
          confirmDisabled={!isValidAmount(topupAmount)}
          loading={isToppingUp}
          onCancel={() => {
            setTopupAmount("");
            setExpanded(null);
          }}
          onConfirm={() =>
            handleTopup(
              topupAmount,
              card as Card,
              fullGrantId,
              setIsToppingUp,
              setTopupAmount,
              collapse,
              mutate,
              hcb,
            ).then(reloadGrant)
          }
        />
      ) : expanded === "withdraw" ? (
        <InlineForm
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          placeholder="500.00"
          amount
          confirmLabel="Withdraw"
          confirmColor="#f47080"
          confirmTextColor="#1f0008"
          confirmDisabled={!isValidAmount(withdrawAmount)}
          loading={isWithdrawing}
          onCancel={() => {
            setWithdrawAmount("");
            setExpanded(null);
          }}
          onConfirm={() =>
            handleWithdraw(
              withdrawAmount,
              card as Card,
              fullGrantId,
              setIsWithdrawing,
              setWithdrawAmount,
              collapse,
              mutate,
              hcb,
            ).then(reloadGrant)
          }
        />
      ) : (
        (canTopup || canWithdraw) && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            {canTopup && (
              <TintButton
                icon="plus"
                label="Topup"
                backgroundColor="#50ECC0"
                color="#114F3D"
                onPress={() => setExpanded("topup")}
              />
            )}
            {canWithdraw && (
              <TintButton
                icon="minus"
                label="Withdraw"
                backgroundColor="#f47080"
                color="#1f0008"
                onPress={() => setExpanded("withdraw")}
              />
            )}
          </View>
        )
      )}

      <View
        style={[sectionStyle, { paddingHorizontal: 16, paddingVertical: 8 }]}
      >
        {grantCard.user?.email && (
          <InfoRow label="Grant sent to" value={grantCard.user.email} />
        )}
        {grantCard.expires_on && (
          <InfoRow
            label="Expires on"
            value={format(new Date(grantCard.expires_on), "MMM d, yyyy")}
          />
        )}
        <InfoRow
          label="One time use?"
          value={grantCard.one_time_use ? "Yes" : "No"}
        />
        <InfoRow
          label="Allowed merchants"
          value={formatMerchantNames(grantCard.allowed_merchants)}
        />
        <InfoRow
          label="Allowed categories"
          value={formatCategoryNames(grantCard.allowed_categories)}
        />
        {grantCard.purpose && (
          <InfoRow label="Purpose" value={grantCard.purpose} />
        )}
      </View>

      {(grantPolicy?.toggleOneTimeUse() || grantPolicy?.editPurpose()) && (
        <View
          style={[sectionStyle, { paddingHorizontal: 16, paddingVertical: 4 }]}
        >
          {grantPolicy?.toggleOneTimeUse() && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: themeColors.text,
                  }}
                >
                  One time use
                </Text>
                <Text style={{ fontSize: 13, color: subTextColor(isDark) }}>
                  Cancel this grant after its next purchase
                </Text>
              </View>
              <Switch
                value={grantCard.one_time_use}
                disabled={isOneTimeUse}
                onValueChange={() =>
                  handleOneTimeUse(
                    card as Card,
                    setIsOneTimeUse,
                    mutate,
                    hcb,
                    fullGrantId,
                    grantCard,
                  ).then(reloadGrant)
                }
              />
            </View>
          )}
          {grantPolicy?.editPurpose() &&
            (expanded === "purpose" ? (
              <View style={{ paddingVertical: 12 }}>
                <InlineForm
                  value={purposeText}
                  onChangeText={setPurposeText}
                  placeholder="What should this grant be spent on?"
                  confirmLabel="Save"
                  confirmColor={palette.info}
                  confirmTextColor="white"
                  confirmDisabled={!purposeText.trim()}
                  loading={isSettingPurpose}
                  onCancel={() => {
                    setPurposeText("");
                    setExpanded(null);
                  }}
                  onConfirm={() =>
                    handleSetPurpose(
                      card as Card,
                      setIsSettingPurpose,
                      setPurposeText,
                      collapse,
                      mutate,
                      hcb,
                      fullGrantId,
                      purposeText,
                    ).then(reloadGrant)
                  }
                />
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setPurposeText(grantCard.purpose ?? "");
                  setExpanded("purpose");
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: themeColors.text,
                    }}
                  >
                    Set purpose
                  </Text>
                  <Text style={{ fontSize: 13, color: subTextColor(isDark) }}>
                    Describe what this grant should be spent on
                  </Text>
                </View>
                <Icon glyph="edit" size={20} color={palette.muted} />
              </Pressable>
            ))}
        </View>
      )}
    </ScrollView>
  );
}
