import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StatusBar, TextInput, View } from "react-native";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import useSWRMutation from "swr/mutation";

import useClient from "../../../../../../src/lib/client";
import { getKey } from "../../../../../../src/lib/organization/useTransactions";
import Transaction from "../../../../../../src/lib/types/Transaction";
import { useOfflineSWR } from "../../../../../../src/lib/useOfflineSWR";
import { palette } from "../../../../../../src/styles/theme";

export default function Page() {
  const { id, transaction: _transaction } = useLocalSearchParams();
  const transaction: Transaction =
    typeof _transaction === "string" ? JSON.parse(_transaction) : _transaction;

  const { colors: themeColors } = useTheme();
  const { mutate } = useSWRConfig();
  const hcb = useClient();

  const {
    data: memoSuggestions,
    isLoading,
    isValidating,
  } = useOfflineSWR<string[]>(
    `organizations/${id}/transactions/${transaction.id}/memo_suggestions`,
    { revalidateOnMount: true },
  );

  const [memo, setMemo] = useState(
    transaction.has_custom_memo ? transaction.memo : "",
  );

  const { trigger } = useSWRMutation(
    `organizations/${id}/transactions/${transaction.id}`,
    () =>
      hcb
        .patch(`organizations/${id}/transactions/${transaction.id}`, {
          json: { memo },
        })
        .json(),
    {
      optimisticData(currentData: Transaction) {
        return { ...currentData, memo };
      },
      populateCache: true,
      onSuccess() {
        mutate(unstable_serialize(getKey(id, "organizations")));
      },
    },
  );

  return (
    <View style={{ padding: 30 }}>
      <TextInput
        style={{
          color: themeColors.text,
          backgroundColor: themeColors.card,
          padding: 10,
          borderRadius: 8,
        }}
        placeholderTextColor={palette.muted}
        selectTextOnFocus
        autoFocus
        enablesReturnKeyAutomatically
        clearButtonMode="while-editing"
        value={memo}
        onChangeText={setMemo}
        placeholder={transaction.memo}
        returnKeyType="done"
        onSubmitEditing={() => {
          trigger();
          router.back();
        }}
      />

      <View style={{ marginTop: 20 }}>
        {isLoading || isValidating ? (
          <View
            style={{
              paddingVertical: 30,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator color={palette.muted} />
            <Text style={{ textAlign: "center", color: palette.muted }}>
              Thinking...
            </Text>
          </View>
        ) : (
          Array.isArray(memoSuggestions) &&
          memoSuggestions.length > 0 && (
            <View>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                ✨ Suggestions
              </Text>
              {[...new Set(memoSuggestions)].map((suggestion, index) => (
                <Text
                  style={{ color: themeColors.text, marginVertical: 10 }}
                  key={index}
                  onPress={() => setMemo(suggestion)}
                  numberOfLines={1}
                >
                  {suggestion}
                </Text>
              ))}
            </View>
          )
        )}
      </View>
    </View>
  );
}
