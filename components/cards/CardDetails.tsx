import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { format } from "date-fns";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { View, Animated, Platform, TouchableOpacity } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

import { CardStatus } from "./CardStatus";
import CopyableRow from "./CopyableRow";

import Divider from "@/components/Divider";
import UserAvatar from "@/components/UserAvatar";
import Card from "@/lib/types/Card";
import GrantCard from "@/lib/types/GrantCard";
import User from "@/lib/types/User";
import { CardDetails as StripeCardDetails } from "@/lib/useStripeCardDetails";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette } from "@/styles/theme";
import {
  redactedCardNumber,
  renderCardNumber,
  renderMoney,
} from "@/utils/format";
import { formatCategoryNames, formatMerchantNames } from "@/utils/org";

function InfoRow({
  label,
  value,
  wrap,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        ...(wrap && { flexWrap: "wrap" }),
      }}
    >
      <Text style={{ fontSize: 16, color: themeColors.text, flexShrink: 1 }}>
        {label}
      </Text>
      <Text
        style={{
          color: palette.muted,
          fontSize: 16,
          fontWeight: "500",
          fontFamily: "JetBrainsMono-Regular",
          flexShrink: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

interface CardDetailsProps {
  card: Card;
  grantCard?: GrantCard;
  isGrantCard: boolean;
  isCardholder: boolean;
  cardName: string;
  details: StripeCardDetails | undefined;
  detailsRevealed: boolean;
  detailsLoading: boolean;
  cardDetailsLoading: boolean;
  createSkeletonStyle: (
    width: number,
    height: number,
    extraStyles?: Record<string, unknown>,
  ) => Record<string, unknown>;
  user?: User;
}


export default function CardDetails({
  card,
  grantCard,
  isGrantCard,
  isCardholder,
  cardName,
  details,
  detailsRevealed,
  detailsLoading,
  cardDetailsLoading,
  createSkeletonStyle,
  user,
}: CardDetailsProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  useEffect(() => {
    if (detailsRevealed && details) {
      ScreenCapture.preventScreenCaptureAsync("card-details");
    } else {
      ScreenCapture.allowScreenCaptureAsync("card-details");
    }

    return () => {
      ScreenCapture.allowScreenCaptureAsync("card-details");
    };
  }, [detailsRevealed, details]);

  const handleCopy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: "Copied",
      textBody: `${label} copied to clipboard`,
    });
  };

  const billingAddress = user?.billing_address ?? card?.user?.billing_address;

  return (
    <View
      style={{
        marginBottom: 24,
        padding: 20,
        borderRadius: 8,
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
      }}
    >
      <CardStatus card={card} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 15,
          paddingRight: 90,
        }}
      >
        {card?.user?.id ? (
          <UserAvatar user={card.user} size={40} style={{ marginRight: 10 }} />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: palette.muted,
              marginRight: 10,
            }}
          />
        )}
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: themeColors.text,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {cardName}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: palette.muted,
              marginTop: 2,
            }}
          >
            {card?.type === "virtual" ? "Virtual Card" : "Physical Card"}
          </Text>
        </View>
      </View>

      <Divider />

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
          Card Number
        </Text>
        <View
          style={{
            flex: 1,
            alignItems: "flex-end",
            justifyContent: "flex-end",
          }}
        >
          {detailsLoading ||
          cardDetailsLoading ||
          (detailsRevealed && !details) ? (
            <Animated.View style={createSkeletonStyle(120, 22)} />
          ) : detailsRevealed && details ? (
            <TouchableOpacity
              onPress={() => handleCopy(details.number, "Card number")}
            >
              <Text
                style={{
                  color: palette.muted,
                  fontSize: Platform.OS === "android" ? 15 : 16,
                  fontWeight: "500",
                  fontFamily: "JetBrainsMono-Regular",
                }}
              >
                {renderCardNumber(details.number)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: Platform.OS === "android" ? 15 : 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
            >
              {redactedCardNumber(card?.last4 ?? grantCard?.last4)}
            </Text>
          )}
        </View>
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
          Expires
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {detailsLoading ||
          cardDetailsLoading ||
          (detailsRevealed && !details) ? (
            <Animated.View style={createSkeletonStyle(70, 22)} />
          ) : detailsRevealed && details ? (
            <TouchableOpacity
              onPress={() =>
                handleCopy(
                  `${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`,
                  "Expiry date",
                )
              }
            >
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 16,
                  fontWeight: "500",
                  fontFamily: "JetBrainsMono-Regular",
                }}
              >
                {`${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
            >
              {"••/••"}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: themeColors.text,
            flexShrink: 1,
          }}
        >
          CVC
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {detailsLoading ||
          cardDetailsLoading ||
          (detailsRevealed && !details) ? (
            <Animated.View style={createSkeletonStyle(50, 22)} />
          ) : detailsRevealed && details ? (
            <TouchableOpacity onPress={() => handleCopy(details.cvc, "CVC")}>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 16,
                  fontWeight: "500",
                  fontFamily: "JetBrainsMono-Regular",
                }}
              >
                {details.cvc}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
            >
              {"•••"}
            </Text>
          )}
        </View>
      </View>

      {billingAddress && isCardholder && (
        <>
          <Divider />
          <CopyableRow
            label="Address Line 1"
            value={billingAddress.address_line1}
            onCopy={() =>
              handleCopy(billingAddress.address_line1, "Address line 1")
            }
          />
          {billingAddress.address_line2 && (
            <CopyableRow
              label="Address Line 2"
              value={billingAddress.address_line2}
              onCopy={() =>
                handleCopy(billingAddress.address_line2 ?? "", "Address line 2")
              }
            />
          )}
          <CopyableRow
            label="City"
            value={billingAddress.city}
            onCopy={() => handleCopy(billingAddress.city, "City")}
          />
          <CopyableRow
            label="State"
            value={billingAddress.state}
            onCopy={() => handleCopy(billingAddress.state, "State")}
          />
          <CopyableRow
            label="Postal Code"
            value={billingAddress.postal_code}
            onCopy={() => handleCopy(billingAddress.postal_code, "Postal code")}
          />
        </>
      )}

      {isGrantCard && (
        <>
          <Divider />

          <View>
            {grantCard?.user?.email && !isCardholder && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: themeColors.text, flexShrink: 1 }}>
                  Grant sent to
                </Text>
                <Text
                  style={{
                    color: palette.muted,
                    fontSize: 16,
                    fontWeight: "500",
                    fontFamily: "JetBrainsMono-Regular",
                  }}
                  onPress={() =>
                    Linking.openURL(`mailto:${grantCard?.user?.email}`)
                  }
                >
                  {grantCard?.user?.email}
                </Text>
              </View>
            )}
            <InfoRow
              label="Allowed Merchants"
              value={formatMerchantNames(grantCard?.allowed_merchants)}
              wrap
            />
            <InfoRow
              label="Allowed Categories"
              value={formatCategoryNames(grantCard?.allowed_categories)}
              wrap
            />
            {grantCard?.purpose && (
              <InfoRow label="Purpose" value={grantCard.purpose} />
            )}
          </View>
          <InfoRow
            label="One time use?"
            value={grantCard?.one_time_use ? "Yes" : "No"}
          />
          {grantCard?.expires_on && (
            <InfoRow
              label="Spend By"
              value={format(new Date(grantCard.expires_on), "MMM d, yyyy")}
            />
          )}
        </>
      )}

      {card?.total_spent_cents != null && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 12,
                color: palette.muted,
                textTransform: "uppercase",
              }}
            >
              Spending Limit
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: themeColors.text,
              }}
            >
              {renderMoney(card?.balance_available ?? 0)}
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontSize: 12,
                textAlign: "right",
                color: palette.muted,
                textTransform: "uppercase",
              }}
            >
              Total Spent
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: themeColors.text,
                textAlign: "right",
              }}
            >
              {renderMoney(card?.total_spent_cents)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
