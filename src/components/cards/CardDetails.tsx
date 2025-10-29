import { useTheme } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { View, Text, Animated } from "react-native";

import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import { CardDetails as StripeCardDetails } from "../../lib/useStripeCardDetails";
import { palette } from "../../styles/theme";
import {
  formatCategoryNames,
  formatMerchantNames,
  redactedCardNumber,
  renderCardNumber,
  renderMoney,
} from "../../utils/util";
import Divider from "../Divider";
import UserAvatar from "../UserAvatar";

import { CardStatus } from "./CardStatus";

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
}: CardDetailsProps) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        marginBottom: 24,
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
      <CardStatus card={card} />

      {card?.user?.id ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 15,
            paddingRight: 90,
          }}
        >
          <UserAvatar user={card.user} size={40} style={{ marginRight: 10 }} />
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
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 15,
            paddingRight: 90,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: palette.muted,
              marginRight: 10,
            }}
          />
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: themeColors.text,
              }}
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
      )}

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
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {detailsLoading ||
          cardDetailsLoading ||
          (detailsRevealed && !details) ? (
            <Animated.View style={createSkeletonStyle(120, 22)} />
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
              selectable={detailsRevealed && details ? true : false}
            >
              {detailsRevealed && details
                ? renderCardNumber(details.number)
                : redactedCardNumber(card?.last4 ?? grantCard?.last4)}
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
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
              selectable={detailsRevealed && details ? true : false}
            >
              {detailsRevealed && details
                ? `${String(details.exp_month).padStart(2, "0")}/${details.exp_year}`
                : "••/••"}
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
          CVC
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          {detailsLoading ||
          cardDetailsLoading ||
          (detailsRevealed && !details) ? (
            <Animated.View style={createSkeletonStyle(50, 22)} />
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
              selectable={detailsRevealed && details ? true : false}
            >
              {detailsRevealed && details ? details.cvc : "•••"}
            </Text>
          )}
        </View>
      </View>

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
                <Text
                  style={{
                    fontSize: 16,
                    color: themeColors.text,
                    flexShrink: 1,
                  }}
                >
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
