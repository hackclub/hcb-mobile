import { useLocalSearchParams } from "expo-router";

import TransactionPage from "@/app/(app)/(events)/[id]/transactions/[transactionId]";

export default function Page() {
  const params = useLocalSearchParams<{
    transactionId: string;
    orgId?: string;
    transaction?: string;
  }>();
  return <TransactionPage data={params} />;
}
