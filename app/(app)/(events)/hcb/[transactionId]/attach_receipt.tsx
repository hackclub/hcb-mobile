import { Redirect, useLocalSearchParams } from "expo-router";

export default function Page() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();

  return (
    <Redirect
      href={{
        pathname: "/(events)/hcb/[transactionId]",
        params: { transactionId, attachReceipt: "true" },
      }}
    />
  );
}
