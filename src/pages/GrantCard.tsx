import React, { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import useSWR from "swr";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme';
import { CardsStackParamList } from "../lib/NavigatorParamList";
import useClient from "../lib/client";
import GrantCardType from "../lib/types/GrantCard";

type Props = NativeStackScreenProps<CardsStackParamList, "GrantCard">;

export default function GrantCardPage({ route, navigation }: Props) {
  const { grantId } = route.params;
  const hcb = useClient();
  const { colors } = useTheme();
  const { data: grants, error } = useSWR<GrantCardType[]>(
    "user/card_grants",
    (url: string) => hcb(url).json<GrantCardType[]>()
  );
  // Loading state
  if (!grants) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  // Find matching grant by full/short IDs
  const grant = grants.find((g) =>
    g.id === grantId || g.id.endsWith(grantId) || g.id === `cdg_${grantId}` ||
    g.card_id === grantId || g.card_id.endsWith(grantId) || g.card_id === `crd_${grantId}`
  );
  // Error or not found
  if (error || !grant) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={64} color={palette.muted} />
        <Text style={{ marginTop: 16, fontSize: 20, color: colors.text, fontWeight: "bold" }}>
          Card Not Available
        </Text>
        <Text style={{ marginTop: 8, fontSize: 16, color: colors.text, textAlign: "center" }}>
          This grant does not exist or you don’t have access to view it.
        </Text>
      </View>
    );
  }
  useEffect(() => {
    navigation.push("Card", { cardId: grant.card_id });
  }, [grant.card_id, navigation]);
  return null;
}
