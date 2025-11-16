import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { View, Text, Alert } from "react-native";

import Button from "../../components/Button";
import CardSkeleton from "../../components/cards/CardSkeleton";
import useClient from "../../lib/client";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import GrantCardType from "../../lib/types/GrantCard";
import User from "../../lib/types/User";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";
import {
  renderMoney,
  formatMerchantNames,
  formatCategoryNames,
} from "../../utils/util";

import CardPage from "./card";
type Props = NativeStackScreenProps<CardsStackParamList, "GrantCard">;

export default function GrantCardPage({ route, navigation }: Props) {
  const { grantId } = route.params;
  const { data: grant, mutate: reloadGrant } = useOfflineSWR<GrantCardType>(
    `card_grants/cdg_${grantId}`,
  );
  const { data: user } = useOfflineSWR<User>(`user`);
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const [isActivating, setIsActivating] = useState(false);
  const isGrantCardholder = grant?.user?.id === user?.id;
  const handleActivateGrant = async () => {
    setIsActivating(true);
    try {
      const response = await hcb.post(`card_grants/cdg_${grantId}/activate`);

      if (response.ok) {
        await reloadGrant();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Grant activated successfully!");
      } else {
        const data = (await response.json()) as { error?: string };
        Alert.alert("Error", data.error || "Failed to activate grant");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error activating grant", err, { grantId });
      Alert.alert("Error", "Failed to activate grant. Please try again later.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsActivating(false);
    }
  };

  if (!grant) {
    return <CardSkeleton />;
  }

  if (!grant.card_id) {
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
            {grant.status === "canceled"
              ? "Sorry, this grant was cancelled!"
              : grant.status == "active"
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
        {grant.status === "active" && isGrantCardholder && (
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
          {/* Current API scopes does not include the user email */}
          {/* <View
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
          </View> */}
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
