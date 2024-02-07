import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import useSWRMutation from "swr/mutation";

import AuthContext from "../auth";
import { StackParamList } from "../lib/NavigatorParamList";
import { getKey } from "../lib/organization/useTransactions";
import Transaction from "../lib/types/Transaction";
import { palette } from "../theme";

type Props = NativeStackScreenProps<StackParamList, "RenameTransaction">;

export default function RenameTransactionPage({
  route: {
    params: { transaction, orgId },
  },
  navigation,
}: Props) {
  const { token } = useContext(AuthContext);
  const { colors: themeColors } = useTheme();
  const { mutate } = useSWRConfig();

  const {
    data: memoSuggestions,
    isLoading,
    isValidating,
  } = useSWR<string[]>(
    `/organizations/${orgId}/transactions/${transaction.id}/memo_suggestions`,
    { revalidateOnMount: true },
  );

  const [memo, setMemo] = useState(
    transaction.has_custom_memo ? transaction.memo : "",
  );

  const { trigger } = useSWRMutation(
    `/organizations/${orgId}/transactions/${transaction.id}`,
    () =>
      fetch(
        process.env.EXPO_PUBLIC_API_BASE +
          `/organizations/${orgId}/transactions/${transaction.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            memo,
          }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      ).then((res) => res.json()),
    {
      optimisticData(currentData: Transaction) {
        return { ...currentData, memo };
      },
      populateCache: true,
      onSuccess() {
        mutate(unstable_serialize(getKey(orgId)));
      },
    },
  );

  return (
    <View style={{ padding: 20 }}>
      <StatusBar barStyle="light-content" />

      <TextInput
        style={{
          color: themeColors.text,
          backgroundColor: themeColors.card,
          padding: 10,
          borderRadius: 8,
        }}
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
          navigation.goBack();
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
