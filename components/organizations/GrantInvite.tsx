import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TouchableHighlight,
  View,
} from "react-native";

import GrantTermsModal from "@/components/grants/GrantTermsModal";
import { Text } from "@/components/Text";
import { parseApiError } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import GrantCard from "@/lib/types/GrantCard";
import { palette } from "@/styles/theme";
import { renderMoney } from "@/utils/format";
import * as Haptics from "@/utils/haptics";
import { orgColor } from "@/utils/org";
import { maybeRequestReview } from "@/utils/storeReview";

interface GrantInviteProps {
  grant: GrantCard;
  style?: object;
}

export default function GrantInvite({ grant, style }: GrantInviteProps) {
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      const response = await hcb.post(`card_grants/${grant.id}/activate`);

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        maybeRequestReview();

        setShowTerms(false);
        router.push({
          pathname: "/(events)/card-grants/[id]",
          params: { id: grant.id },
        });
      } else {
        const errorData = (await response.json()) as {
          messages?: string[];
          error?: string;
        };
        Alert.alert(
          "Error",
          errorData.messages?.[0] ||
            errorData.error ||
            "Failed to create card for grant",
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error creating card for grant", err, {
        grantId: grant.id,
      });
      Alert.alert(
        "Error",
        await parseApiError(
          err,
          "Failed to create card. Please try again later.",
        ),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreatingCard(false);
    }
  };

  return (
    <>
      <GrantTermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        onAgree={handleCreateCard}
        organizationName={grant.organization.name}
        activating={isCreatingCard}
      />
      <TouchableHighlight
        style={[
          {
            backgroundColor: themeColors.card,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: palette.primary,
          },
          style,
        ]}
        underlayColor={themeColors.background}
        activeOpacity={0.7}
        onPress={() => setShowTerms(true)}
        disabled={isCreatingCard}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            gap: 12,
          }}
        >
          {grant.organization.icon ? (
            <Image
              source={{ uri: grant.organization.icon }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={{ width: 40, height: 40, borderRadius: 8 }}
            />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: orgColor(grant.organization.id),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
                {grant.organization.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: themeColors.text,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {grant.organization.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}
            >
              {isCreatingCard
                ? "Activating grant..."
                : "Tap to activate your grant"}
            </Text>
          </View>
          {isCreatingCard ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={{
                color: palette.primary,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {renderMoney(grant.amount_cents)}
            </Text>
          )}
        </View>
      </TouchableHighlight>
    </>
  );
}
