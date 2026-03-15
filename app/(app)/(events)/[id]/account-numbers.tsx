import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import * as Clipboard from "expo-clipboard";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Linking, View } from "react-native";

import { OrganizationExpanded } from "@/lib/types/Organization";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

function AccountDetail({
  title,
  value,
}: {
  title: string;
  value: string | undefined;
}) {
  const { colors: themeColors } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  return (
    <View>
      <Text style={{ color: palette.muted, fontSize: 14 }}>{title}</Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <Text
          style={{
            color: themeColors.text,
            fontFamily: "JetBrainsMono-Regular",
            fontSize: 26,
          }}
        >
          {value}
        </Text>
        <Ionicons.Button
          name={copied ? "checkmark" : "copy-outline"}
          iconStyle={{ marginRight: 0 }}
          color={copied ? palette.success : palette.primary}
          backgroundColor="transparent"
          underlayColor={themeColors.background}
          onPress={() => {
            if (value) {
              impactAsync(ImpactFeedbackStyle.Heavy);
              Clipboard.setStringAsync(value);
              setCopied(true);
            }
          }}
        />
      </View>
    </View>
  );
}

export default function AccountNumberPage() {
  const params = useLocalSearchParams<{ id: string; fallbackData?: string }>();

  const { data: organization, isLoading: organizationLoading } =
    useOfflineSWR<OrganizationExpanded>(`organizations/${params.id}`, {
      fallbackData: params.fallbackData
        ? (JSON.parse(params.fallbackData) as OrganizationExpanded)
        : undefined,
    });

  const { colors: themeColors } = useTheme();

  if (organizationLoading && !organization) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (
    !organizationLoading &&
    (organization?.routing_number == null ||
      organization?.account_number == null ||
      organization?.swift_bic_code == null)
  ) {
    return (
      <View
        style={{
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <View style={{ alignItems: "center", maxWidth: 320 }}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={palette.muted}
            style={{ marginBottom: 20 }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: themeColors.text,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Account Details Not Available
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: palette.muted,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            Your account details haven't been generated yet. Please generate
            them on the website.
          </Text>
          <Button
            title="Open Web Dashboard"
            color={palette.primary}
            onPress={() => {
              Linking.openURL(
                `https://hcb.hackclub.com/${organization?.slug}/account-number`,
              );
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 16,
        flex: 1,
      }}
    >
      <Text style={{ fontSize: 15, color: palette.muted, marginBottom: 20 }}>
        Use these details to receive ACH and wire transfers.
      </Text>
      <View style={{ flexDirection: "column" }}>
        <AccountDetail
          title="Routing number"
          value={organization?.routing_number}
        />
        <AccountDetail
          title="Account number"
          value={organization?.account_number}
        />
        <AccountDetail
          title="SWIFT BIC code"
          value={organization?.swift_bic_code}
        />
      </View>
    </View>
  );
}
