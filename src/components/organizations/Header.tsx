import { useTheme } from "@react-navigation/native";
import { View, Text } from "react-native";

import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
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

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        marginBottom: 32,
        gap: 10,
      }}
    >
      <View>
        <Text
          style={{
            color: palette.muted,
            fontSize: 12,
            textTransform: "uppercase",
          }}
        >
          Balance
        </Text>
        <Text style={{ color: themeColors.text, fontSize: 36 }}>
          {"balance_cents" in organization
            ? renderMoney(organization.balance_cents)
            : "$0.00"}
        </Text>
      </View>
      {organization?.playground_mode && (
        <Button
          style={{
            backgroundColor: "#3F9CEE",
            borderTopWidth: 0,
          }}
          color="#fff"
          onPress={() => setShowMockData(!showMockData)}
        >
          {showMockData ? "Hide Mock Data" : "Show Mock Data"}
        </Button>
      )}
    </View>
  );
}
