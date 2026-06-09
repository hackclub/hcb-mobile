import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import Badge from "@/components/Badge";
import { ShareHeaderButton } from "@/components/ShareHeaderButton";
import { Text } from "@/components/Text";
import { OrgInvoice, invoiceStatusColor } from "@/lib/types/Invoice";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { renderDate, renderMoney } from "@/utils/format";
import { shareUrl } from "@/utils/shareUrl";

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

export default function InvoiceDetailPage() {
  const { invoiceId } = useLocalSearchParams<{
    id: string;
    invoiceId: string;
  }>();
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();

  const { data: invoice, isLoading } = useOfflineSWR<OrgInvoice>(
    `invoices/${invoiceId}`,
  );

  useEffect(() => {
    if (invoice) {
      navigation.setOptions({
        headerRight: () => (
          <ShareHeaderButton url={shareUrl.invoice(invoice.id)} />
        ),
      });
    }
  }, [invoice, navigation]);

  if (isLoading || !invoice) {
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
        <Badge color={invoiceStatusColor(invoice.status)}>
          {invoice.status}
        </Badge>
        <Text
          style={{ fontSize: 32, fontWeight: "700", color: themeColors.text }}
        >
          {renderMoney(invoice.amount_due)}
        </Text>
        <Text style={{ color: palette.muted, fontSize: 15 }}>
          Invoiced to {invoice.to}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <DetailRow label="Created">
          <Text style={{ color: themeColors.text, fontSize: 15 }}>
            {renderDate(invoice.created_at)}
          </Text>
        </DetailRow>
        {invoice.due_date && (
          <>
            <Divider />
            <DetailRow label="Due">
              <Text style={{ color: themeColors.text, fontSize: 15 }}>
                {renderDate(invoice.due_date)}
              </Text>
            </DetailRow>
          </>
        )}
        {invoice.item_description && (
          <>
            <Divider />
            <DetailRow label="For">
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 15,
                  textAlign: "right",
                }}
              >
                {invoice.item_description}
              </Text>
            </DetailRow>
          </>
        )}
        {invoice.memo && (
          <>
            <Divider />
            <DetailRow label="Memo">
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 15,
                  textAlign: "right",
                }}
              >
                {invoice.memo}
              </Text>
            </DetailRow>
          </>
        )}
      </View>
    </ScrollView>
  );
}
