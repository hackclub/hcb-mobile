import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { View, Text, StatusBar, Button } from "react-native";
import useSWR from "swr";

import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import { palette } from "../../theme";

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
    params: { orgId },
  },
}: Props) {
  const { data: organization } = useSWR<OrganizationExpanded>(
    `organizations/${orgId}`,
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={{ marginRight: Constants.platform?.android ? 15 : 0 }}>
          <Button
            title="Done"
            color={palette.primary}
            onPress={() => navigation.goBack()}
          />
        </View>
      ),
    });
  }, [navigation]);

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
