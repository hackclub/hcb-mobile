import { useTheme } from "@react-navigation/native";
import { format } from "date-fns";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { View, Text, Animated, Platform, TouchableOpacity } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

import Card from "../../lib/types/Card";
import GrantCard from "../../lib/types/GrantCard";
import User from "../../lib/types/User";
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

      {(user?.billing_address) && (
        <>
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
                Address Line 1
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <TouchableOpacity
                  onPress={() =>
                    handleCopy(
                      (user?.billing_address || card?.user?.billing_address)
                        ?.address_line1 || "",
                      "Address line 1",
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
                    {(user?.billing_address || card?.user?.billing_address)
                      ?.address_line1}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {user?.billing_address?.address_line2 && (
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
                Address Line 2
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <TouchableOpacity
                  onPress={() =>
                    handleCopy(
                      (user?.billing_address || card?.user?.billing_address)
                        ?.address_line2 || "",
                      "Address line 2",
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
                    {(user?.billing_address || card?.user?.billing_address)
                      ?.address_line2}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                City
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <TouchableOpacity
                  onPress={() =>
                    handleCopy(
                      (user?.billing_address || card?.user?.billing_address)
                        ?.city || "",
                      "City",
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
                    {(user?.billing_address || card?.user?.billing_address)
                      ?.city}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: themeColors.text,
                  flexShrink: 1,
                }}
              >
                State
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <TouchableOpacity
                  onPress={() =>
                    handleCopy(
                      (user?.billing_address || card?.user?.billing_address)
                        ?.state || "",
                      "State",
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
                    {(user?.billing_address || card?.user?.billing_address)
                      ?.state}
                  </Text>
                </TouchableOpacity>
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
                Postal Code
              </Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <TouchableOpacity
                  onPress={() =>
                    handleCopy(
                      (user?.billing_address || card?.user?.billing_address)
                        ?.postal_code || "",
                      "Postal code",
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
                    {(user?.billing_address || card?.user?.billing_address)
                      ?.postal_code}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
                  Purpose
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
                  {grantCard?.purpose}
                </Text>
              </View>
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
          {grantCard?.expires_on && (
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
                Spend By
              </Text>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 16,
                  fontWeight: "500",
                  fontFamily: "JetBrainsMono-Regular",
                }}
              >
                {format(new Date(grantCard.expires_on), "MMM d, yyyy")}
              </Text>
            </View>
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
