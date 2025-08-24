import { NativeStackScreenProps } from "@react-navigation/native-stack";
import useSWR from "swr";

import CardSkeleton from "../../components/cards/CardSkeleton";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import GrantCardType from "../../lib/types/GrantCard";
import CardPage from "../card";

type Props = NativeStackScreenProps<CardsStackParamList, "GrantCard">;

export default function GrantCardPage({ route, navigation }: Props) {
  const { grantId } = route.params;
  const { data: grant } = useSWR<GrantCardType>(`card_grants/cdg_${grantId}`);

  if (!grant) {
    return <CardSkeleton />;
  }

  return (
    <CardPage
      cardId={grant.card_id}
      navigation={navigation}
      grantId={`cdg_${grantId}`}
    />
  );
}
