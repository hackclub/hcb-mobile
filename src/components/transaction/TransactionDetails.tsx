import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { ReactElement } from "react";
import { View, Text, TouchableHighlight } from "react-native";

import { StackParamList } from "../../lib/NavigatorParamList";
import Transaction from "../../lib/types/Transaction";
import { palette } from "../../theme";

interface Detail {
  label: string;
  value: ReactElement | string;
  onPress?: () => void;
  pressIconName?: React.ComponentProps<typeof Ionicons>["name"];
  fontFamily?: string;
}

export function descriptionDetail(
  org: string,
  transaction: Transaction,
  navigation: NativeStackNavigationProp<StackParamList, "Transaction">,
): Detail {
  return {
    label: "Memo",
    value: transaction.memo ? transaction.memo : "Add Description",
    onPress() {
      navigation.navigate("RenameTransaction", { orgId: org, transaction });
    },
  };
}

export default function TransactionDetails({
  details,
  title,
}: {
  details: Detail[];
  title?: string;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ marginBottom: 30 }}>
      {title && (
        <Text
          style={{
            color: palette.muted,
            fontSize: 12,
            textTransform: "uppercase",
            marginBottom: 5,
            marginLeft: 10,
          }}
        >
          {title}
        </Text>
      )}

      {details.map(
        (
          {
            label,
            value,
            onPress,
            pressIconName = "chevron-forward-outline",
            fontFamily,
          },
          index,
        ) => (
          <TouchableHighlight
            onPress={onPress}
            underlayColor={themeColors.background}
            activeOpacity={0.7}
            key={label}
          >
            <View
              style={{
                backgroundColor: themeColors.card,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: 10,
                borderTopLeftRadius: index == 0 ? 8 : 0,
                borderTopRightRadius: index == 0 ? 8 : 0,
                borderBottomLeftRadius: index == details.length - 1 ? 8 : 0,
                borderBottomRightRadius: index == details.length - 1 ? 8 : 0,
                maxHeight: 70,
              }}
            >
              <Text style={{ color: palette.muted, marginRight: 10 }}>
                {label}
              </Text>
              {typeof value == "string" ? (
                <Text
                  numberOfLines={2}
                  style={{
                    color: themeColors.text,
                    overflow: "hidden",
                    flex: 1,
                    textAlign: "right",
                    fontFamily,
                  }}
                  selectable
                >
                  {value}
                </Text>
              ) : (
                value
              )}
              {onPress && (
                <Ionicons
                  name={pressIconName}
                  size={18}
                  color={palette.muted}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          </TouchableHighlight>
        ),
      )}
    </View>
  );
}
