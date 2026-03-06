import TransactionPage from "app/(app)/(events)/[id]/transactions/[transactionId]";
import { useLocalSearchParams } from "expo-router";

export default function Page() {
  const params = useLocalSearchParams();
  return <TransactionPage data={params} />;
}
