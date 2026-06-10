import { useTheme } from "expo-router/react-navigation";
import { View } from "react-native";

import BalanceChart from "./BalanceChart";

import { Text } from "@/components/Text";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";

interface HeaderProps {
  organization: Organization | OrganizationExpanded;
  showChart?: boolean;
}

export default function Header({
  organization,
  showChart = true,
}: HeaderProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const balanceValue =
    "balance_cents" in organization ? organization.balance_cents : 0;
  const formattedBalance = renderMoney(balanceValue);

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        padding: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: palette.muted,
              fontSize: 13,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
            bold
          >
            Account Balance
          </Text>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 38,
              fontWeight: "700",
              letterSpacing: -1.5,
              fontVariant: ["tabular-nums"],
            }}
            bold
          >
            {formattedBalance}
          </Text>
        </View>
      </View>
      {showChart && <BalanceChart organizationId={organization.id} />}
    </View>
  );
}
