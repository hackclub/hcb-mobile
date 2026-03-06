import TransactionPage from "app/(app)/(events)/[id]/transactions/[transactionId]";
import { useLocalSearchParams } from "expo-router";

export default function Page() {
  const params = useLocalSearchParams<{ transactionId: string; orgId?: string; transaction?: string }>();
  return <TransactionPage data={params} />;
}
