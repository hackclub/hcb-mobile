import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { OrgInvoice, invoiceStatusColor } from "@/lib/types/Invoice";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";

export default function InvoicesPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const { data: invoices, isLoading } = useOfflineSWR<OrgInvoice[]>(
    `organizations/${id}/invoices`,
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
            pathname: "/(events)/[id]/invoices/new",
            params: { id },
          })
        }
        icon="plus"
        iconSize={24}
      >
        New invoice
      </Button>
      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}
      {!isLoading && invoices && invoices.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color={palette.muted}
          />
          <Text
            style={{ color: palette.muted, fontSize: 15, fontWeight: "600" }}
          >
            No invoices yet
          </Text>
          <Text
            style={{ color: palette.muted, fontSize: 13, textAlign: "center" }}
          >
            Invoice a sponsor and the money will land in your account.
          </Text>
        </View>
      )}
      {invoices && invoices.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {invoices.map((invoice, index) => (
            <View key={invoice.id}>
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
                    pathname: "/(events)/[id]/invoices/[invoiceId]",
                    params: { id, invoiceId: invoice.id },
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
                <View style={{ gap: 4, flex: 1, marginRight: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: themeColors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {invoice.to}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 13 }}>
                    {renderMoney(invoice.amount_due)}
                    {invoice.due_date
                      ? ` · due ${renderDate(invoice.due_date)}`
                      : ""}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Badge color={invoiceStatusColor(invoice.status)}>
                    {invoice.status}
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
