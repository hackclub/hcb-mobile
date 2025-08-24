import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, Linking } from "react-native";
import useSWR from "swr";

import CardSkeleton from "../components/cards/CardSkeleton";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import GrantCardType from "../lib/types/GrantCard";
import { palette } from "../theme";
import { renderMoney, formatMerchantNames, formatCategoryNames } from "../util";

import CardPage from "./card";
type Props = NativeStackScreenProps<CardsStackParamList, "GrantCard">;

export default function GrantCardPage({ route, navigation }: Props) {
  const { grantId } = route.params;
  const { data: grant } = useSWR<GrantCardType>(`card_grants/cdg_${grantId}`);
  const { colors: themeColors } = useTheme();

  if (!grant) {
    return <CardSkeleton />;
  }

  if (!grant.card_id) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
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
            Sorry, this grant was cancelled!
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
              {grant?.status.charAt(0).toUpperCase() + grant?.status.slice(1)}
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
              {grant?.one_time_use ? "Yes" : "No"}
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
              {renderMoney(grant?.amount_cents)}
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
              Grant sent to
            </Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: 16,
                fontWeight: "500",
                fontFamily: "JetBrainsMono-Regular",
              }}
              onPress={() => Linking.openURL(`mailto:${grant?.user?.email}`)}
            >
              {grant?.user?.email}
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
              {formatMerchantNames(grant?.allowed_merchants)}
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
              {formatCategoryNames(grant?.allowed_categories)}
            </Text>
          </View>
          {grant?.purpose && (
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
                {grant?.purpose}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <CardPage
      cardId={grant.card_id}
      navigation={navigation}
      grantId={`cdg_${grantId}`}
    />
  );
}
