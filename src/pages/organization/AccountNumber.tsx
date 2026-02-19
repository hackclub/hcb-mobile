import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { View, StatusBar, Button, Linking, Platform } from "react-native";
import { Text } from "components/Text";

import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { palette } from "../../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "AccountNumber">;

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
      <Text style={{ color: palette.muted, fontSize: 16 }}>{title}</Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
      >
        <Text
          style={{
            color: themeColors.text,
            fontFamily: "JetBrainsMono-Regular",
            fontSize: 30,
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
              Clipboard.setStringAsync(value);
              setCopied(true);
            }
          }}
        />
      </View>
    </View>
  );
}

export default function AccountNumberPage({
  navigation,
  route: {
    params: { orgId, organization: _organization },
  },
}: Props) {
  const { data: organization, isLoading: organizationLoading } =
    useOfflineSWR<OrganizationExpanded>(`organizations/${orgId}`, {
      fallbackData: _organization,
    });

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <>
          {Platform.OS === "android" ? (
            <View style={{ marginRight: 20 }}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={themeColors.text}
                onPress={() => navigation.goBack()}
              />
            </View>
          ) : (
            <Button
              title="Done"
              color={themeColors.text}
              onPress={() => navigation.goBack()}
            />
          )}
        </>
      ),
    });
  }, [navigation]);

  const { colors: themeColors } = useTheme();

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <StatusBar barStyle="light-content" />
        <View style={{ alignItems: "center", maxWidth: 320 }}>
          <Ionicons
            name="document-text-outline"
            size={80}
            color={palette.muted}
            style={{ marginBottom: 24 }}
          />
          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              color: themeColors.text,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Account Details Not Available
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: palette.muted,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 32,
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
        padding: Platform.OS === "android" ? 40 : 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <StatusBar barStyle="light-content" />

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

        <View style={{ flexDirection: "row" }}>
          <Ionicons
            name="information-circle-outline"
            color={palette.muted}
            size={20}
            style={{ marginRight: 10 }}
          />
          <Text style={{ alignSelf: "center", color: palette.muted }}>
            Use these details to receive ACH and wire transfers.
          </Text>
        </View>
      </View>
    </View>
  );
}
