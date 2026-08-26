import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from "react-native";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import useSWRMutation from "swr/mutation";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import useClient from "@/lib/client";
import { getKey } from "@/lib/organization/useTransactions";
import Transaction from "@/lib/types/Transaction";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, subTextColor } from "@/styles/theme";

export default function Page() {
  const { id, transaction: _transaction } = useLocalSearchParams();
  const transaction: Transaction =
    typeof _transaction === "string" ? JSON.parse(_transaction) : _transaction;

  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const { mutate } = useSWRConfig();
  const hcb = useClient();

  const subColor = subTextColor(isDark);
  const borderColor = cardBorderColor(isDark);

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

  const { trigger, isMutating } = useSWRMutation(
    `organizations/${id}/transactions/${transaction.id}`,
    () =>
      hcb
        .patch(`organizations/${id}/transactions/${transaction.id}`, {
          json: { memo },
        })
        .json(),
    {
      optimisticData(currentData?: Transaction) {
        return { ...(currentData ?? transaction), memo };
      },
      populateCache: true,
      onSuccess() {
        mutate(`organizations/${id}/transactions/${transaction.id}`);
        mutate(unstable_serialize(getKey(id as string, "organizations")));
      },
    },
  );

  const handleSave = async () => {
    await trigger();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ padding: 16, gap: 16 }}>
        <TextInput
          style={{
            color: themeColors.text,
            backgroundColor: themeColors.card,
            borderWidth: 1,
            borderColor,
            padding: 12,
            borderRadius: 8,
            fontSize: 15,
          }}
          placeholderTextColor={subColor}
          selectTextOnFocus
          enablesReturnKeyAutomatically
          clearButtonMode="while-editing"
          value={memo}
          onChangeText={setMemo}
          placeholder={transaction.memo}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {isLoading || isValidating ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 8,
            }}
          >
            <ActivityIndicator color={subColor} />
            <Text style={{ color: subColor }}>Thinking...</Text>
          </View>
        ) : (
          Array.isArray(memoSuggestions) &&
          memoSuggestions.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  color: subColor,
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                ✨ Suggestions
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[...new Set(memoSuggestions)].map((suggestion, index) => (
                  <Text
                    key={index}
                    onPress={() => setMemo(suggestion)}
                    numberOfLines={1}
                    style={{
                      color: themeColors.text,
                      fontSize: 14,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor,
                      backgroundColor: themeColors.card,
                    }}
                  >
                    {suggestion}
                  </Text>
                ))}
              </View>
            </View>
          )
        )}

        <Button variant="primary" loading={isMutating} onPress={handleSave}>
          Save
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
