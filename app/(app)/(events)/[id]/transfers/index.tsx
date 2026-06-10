import { MenuAction, MenuView } from "@expo/ui/community/menu";
import { Ionicons } from "@expo/vector-icons";
import Icon from "@thedev132/hackclub-icons-rn";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import { Text } from "@/components/Text";
import {
  OrgTransfer,
  TransferKind,
  TransferStatus,
  transferStatusColor,
  transferStatusText,
} from "@/lib/types/Transfer";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";
import * as Haptics from "@/utils/haptics";

// TODO: replace with a v4 API call once a transfers list endpoint exists
// (the web ledger at events/transfers.html.erb has no API equivalent yet).
const MOCK_TRANSFERS: OrgTransfer[] = [
  {
    id: "xfr_mock1",
    created_at: "2026-06-02T10:00:00Z",
    kind: "ach_transfer",
    status: "deposited",
    to: "Jane Hacker",
    payment_for: "Venue deposit",
    amount_cents: 250000,
  },
  {
    id: "xfr_mock2",
    created_at: "2026-05-28T10:00:00Z",
    kind: "disbursement",
    status: "in_transit",
    to: "Hack Club HQ",
    payment_for: "Fiscal sponsorship share",
    amount_cents: 52050,
  },
  {
    id: "xfr_mock3",
    created_at: "2026-05-20T10:00:00Z",
    kind: "check",
    status: "deposited",
    to: "Acme Printing Co.",
    payment_for: "Event banners",
    amount_cents: 18999,
  },
  {
    id: "xfr_mock4",
    created_at: "2026-05-11T10:00:00Z",
    kind: "wire",
    status: "canceled",
    to: "Global Supplies Ltd.",
    payment_for: "Hardware order",
    amount_cents: 81500,
  },
];

const KIND_ICONS: Record<
  TransferKind,
  React.ComponentProps<typeof Icon>["glyph"]
> = {
  ach_transfer: "bank-account",
  check: "email-fill",
  disbursement: "door-leave",
  wire: "web",
  wise_transfer: "web",
  paypal_transfer: "payment-transfer",
};

// Mirrors the web "What type of transfer?" modal (events/transfers/_form.html.erb).
// Wise and wire transfers aren't supported in the app yet.
const SEND_OPTIONS: {
  id: string;
  title: string;
  image: MenuAction["image"];
  pathname: string;
}[] = [
  {
    id: "ach",
    title: "ACH transfer",
    image: "building.columns",
    pathname: "/(events)/[id]/transfers/ach",
  },
  {
    id: "check",
    title: "Mailed check",
    image: "envelope",
    pathname: "/(events)/[id]/transfers/check",
  },
  {
    id: "hcb",
    title: "HCB transfer",
    image: "arrow.left.arrow.right",
    pathname: "/(events)/[id]/transfers/hcb",
  },
  {
    id: "grant",
    title: "Card grant",
    image: "creditcard",
    pathname: "/(events)/[id]/card-grants/new",
  },
];

const FILTERS: { key: TransferStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposited", label: "Deposited" },
  { key: "in_transit", label: "In transit" },
  { key: "canceled", label: "Canceled" },
];

function Stat({
  label,
  amountCents,
  large,
}: {
  label: string;
  amountCents: number;
  large?: boolean;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text
        style={{
          color: palette.muted,
          fontSize: 12,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: themeColors.text,
          fontSize: large ? 22 : 16,
          fontWeight: "700",
        }}
      >
        {renderMoney(amountCents)}
      </Text>
    </View>
  );
}

export default function TransfersPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const navigation = useNavigation();
  const [filter, setFilter] = useState<TransferStatus | "all">("all");

  const transfers = MOCK_TRANSFERS;

  useEffect(() => {
    const iconColor = isDark ? "white" : "black";
    const menuActions: MenuAction[] = SEND_OPTIONS.map(
      ({ id: actionId, title, image }) => ({
        id: actionId,
        title,
        image,
        imageColor: iconColor,
      }),
    );
    navigation.setOptions({
      headerRight: () => (
        <MenuView
          actions={menuActions}
          onPressAction={({ nativeEvent: { event } }) => {
            Haptics.selectionAsync();
            const option = SEND_OPTIONS.find((o) => o.id === event);
            if (option) {
              router.push({ pathname: option.pathname, params: { id } });
            }
          }}
        >
          <Ionicons.Button
            name="add"
            backgroundColor="transparent"
            size={26}
            color={themeColors.text}
            iconStyle={{ marginRight: 0 }}
            accessibilityLabel="Send a transfer"
          />
        </MenuView>
      ),
    });
  }, [navigation, id, isDark, themeColors.text]);

  const stats = useMemo(() => {
    const sum = (status: TransferStatus) =>
      transfers
        .filter((t) => t.status === status)
        .reduce((acc, t) => acc + t.amount_cents, 0);
    return {
      deposited: sum("deposited"),
      in_transit: sum("in_transit"),
      canceled: sum("canceled"),
    };
  }, [transfers]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? transfers
        : transfers.filter((t) => t.status === filter),
    [transfers, filter],
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 16,
          backgroundColor: themeColors.card,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Stat label="Total" amountCents={stats.deposited} large />
        <Stat label="On the way" amountCents={stats.in_transit} />
        <Stat label="Canceled" amountCents={stats.canceled} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 6,
                backgroundColor: active
                  ? themeColors.primary
                  : themeColors.card,
                borderWidth: 1,
                borderColor: active
                  ? themeColors.primary
                  : cardBorderColor(isDark),
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "600" : "400",
                  color: active ? "white" : themeColors.text,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
          <Icon glyph="payment-transfer" size={40} color={palette.muted} />
          <Text
            style={{ color: palette.muted, fontSize: 15, fontWeight: "600" }}
          >
            No transfers yet
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: cardBorderColor(isDark),
          }}
        >
          {filtered.map((transfer, index) => (
            <View key={transfer.id}>
              {index > 0 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.border,
                    marginHorizontal: 16,
                  }}
                />
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingLeft: 10,
                  paddingRight: 16,
                  paddingVertical: 12,
                }}
              >
                <Icon
                  glyph={KIND_ICONS[transfer.kind]}
                  size={26}
                  color={palette.muted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: themeColors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {transfer.to}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: palette.muted, fontSize: 13 }}
                  >
                    {transfer.payment_for ? `${transfer.payment_for} · ` : ""}
                    {renderDate(transfer.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text
                    style={{
                      color: themeColors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {renderMoney(transfer.amount_cents)}
                  </Text>
                  <Badge color={transferStatusColor(transfer.status)}>
                    {transferStatusText(transfer.status)}
                  </Badge>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
