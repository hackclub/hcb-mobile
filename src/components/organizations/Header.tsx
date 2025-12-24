import { useTheme } from "@react-navigation/native";
import { View, Text, Platform } from "react-native";

import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";
import { renderMoney } from "../../utils/util";
import Button from "../Button";

interface HeaderProps {
  organization: Organization | OrganizationExpanded;
  showMockData: boolean;
  setShowMockData: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Header({
  organization,
  showMockData,
  setShowMockData,
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
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        ...(Platform.OS === "ios" && {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 8,
        }),
        ...(Platform.OS === "android" && {
          elevation: isDark ? 4 : 2,
        }),
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
          >
            {formattedBalance}
          </Text>
        </View>

        {organization?.playground_mode && (
          <Button
            variant="secondary"
            style={{
              backgroundColor: isDark
                ? "rgba(56, 142, 218, 0.15)"
                : "rgba(56, 142, 218, 0.1)",
              borderColor: isDark
                ? "rgba(56, 142, 218, 0.3)"
                : "rgba(56, 142, 218, 0.2)",
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
            color="#338eda"
            fontSize={14}
            onPress={() => setShowMockData(!showMockData)}
          >
            {showMockData ? "Hide Mock" : "Show Mock"}
          </Button>
        )}
      </View>
    </View>
  );
}
