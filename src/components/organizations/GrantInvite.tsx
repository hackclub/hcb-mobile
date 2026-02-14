import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { View, Text, TouchableHighlight, Alert } from "react-native";

import useClient from "../../lib/client";
import { StackParamList } from "../../lib/NavigatorParamList";
import GrantCard from "../../lib/types/GrantCard";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";
import { maybeRequestReview } from "../../utils/storeReview";
import { renderMoney } from "../../utils/util";

interface GrantInviteProps {
  grant: GrantCard;
  navigation: NativeStackNavigationProp<StackParamList, "Organizations">;
  style?: object;
}

export default function GrantInvite({
  grant,
  navigation,
  style,
}: GrantInviteProps) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      const response = await hcb.post(`card_grants/${grant.id}/activate`);

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        maybeRequestReview();

        navigation.navigate("GrantCard", {
          grantId: grant.id,
        });
      } else {
        const errorData = (await response.json()) as { error?: string };
        Alert.alert(
          "Error",
          errorData.error || "Failed to create card for grant",
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error creating card for grant", err, {
        grantId: grant.id,
      });
      Alert.alert("Error", "Failed to create card. Please try again later.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreatingCard(false);
    }
  };

  return (
    <TouchableHighlight
      style={[
        {
          backgroundColor: themeColors.card,
          borderRadius: 10,
          marginBottom: 10,
          borderWidth: 2,
          borderColor: palette.primary,
        },
        style,
      ]}
      underlayColor={themeColors.background}
      activeOpacity={0.7}
      onPress={handleCreateCard}
      disabled={isCreatingCard}
    >
      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: themeColors.text,
              fontSize: 18,
              fontWeight: "600",
              flexShrink: 1,
            }}
          >
            {grant.organization.name} sent you a grant
          </Text>
          <Text
            style={{ color: palette.primary, fontSize: 16, fontWeight: "500" }}
          >
            {renderMoney(grant.amount_cents)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 14 }}>
            Tap to activate your grant
          </Text>
          {isCreatingCard && (
            <Text
              style={{
                color: palette.primary,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              Activating grant...
            </Text>
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
}
