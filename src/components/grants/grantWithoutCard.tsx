import { useTheme } from "@react-navigation/native";
import { View, Text } from "react-native";

import GrantCard from "../../lib/types/GrantCard";
import User from "../../lib/types/User";
import { palette } from "../../styles/theme";
import {
  formatCategoryNames,
  formatMerchantNames,
  renderMoney,
} from "../../utils/util";
import Button from "../Button";

export default function GrantWithoutCard({
  grantCard,
  user,
  isActivating,
  handleActivateGrant,
}: {
  grantCard: GrantCard;
  user: User;
  isActivating: boolean;
  handleActivateGrant: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isGrantCardholder = grantCard?.user?.id === user?.id;

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: palette.muted,
            borderBlockColor: palette.muted,
            borderWidth: 2,
            borderColor: palette.muted,
            paddingVertical: 30,
            paddingHorizontal: 40,
            borderRadius: 10,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          {grantCard.status === "canceled"
            ? "Sorry, this grant was cancelled!"
            : grantCard.status === "active"
              ? "This grant hasn't been accepted yet!"
              : "Sorry, this grant is not available!"}
        </Text>
        <Text
          style={{
            fontSize: 14,
            opacity: 0.7,
            color: themeColors.text,
          }}
        >
          Available Balance
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginTop: 5,
            color: themeColors.text,
          }}
        >
          $0
        </Text>
      </View>

      {/* Show activate button for grants that are active but not yet activated */}
      {grantCard.status === "active" && isGrantCardholder && (
        <View style={{ marginTop: 20 }}>
          <Button
            style={{
              backgroundColor: palette.primary,
              borderTopWidth: 0,
              borderRadius: 12,
            }}
            color="white"
            iconColor="white"
            iconSize={32}
            icon="rep"
            onPress={handleActivateGrant}
            loading={isActivating}
          >
            Activate Grant
          </Button>
        </View>
      )}
      <View
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 15,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
          backgroundColor: themeColors.card,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              flexShrink: 1,
            }}
          >
            Grant status
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {grantCard?.status.charAt(0).toUpperCase() +
              grantCard?.status.slice(1)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              flexShrink: 1,
            }}
          >
            One time use?
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {grantCard?.one_time_use ? "Yes" : "No"}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              flexShrink: 1,
            }}
          >
            Grant amount
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {renderMoney(grantCard?.amount_cents)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
            }}
          >
            Allowed Merchants
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {formatMerchantNames(grantCard?.allowed_merchants)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: themeColors.text,
              flexShrink: 1,
            }}
          >
            Allowed Categories
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: 16,
              fontWeight: "500",
              fontFamily: "JetBrainsMono-Regular",
            }}
          >
            {formatCategoryNames(grantCard?.allowed_categories)}
          </Text>
        </View>
        {grantCard?.purpose && (
          <>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.text,
                flexShrink: 1,
              }}
            >
              Purpose
            </Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
            >
              {grantCard?.purpose}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
