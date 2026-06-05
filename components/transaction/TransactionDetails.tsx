import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { Text } from "@/components/Text";
import { router } from "expo-router";
import React, { ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useIsDark } from "@/lib/useColorScheme";
import Transaction from "@/lib/types/Transaction";
import { palette } from "@/styles/theme";

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
): Detail {
  return {
    label: "Memo",
    value: transaction.memo ? transaction.memo : "Add Description",
    onPress() {
      router.push({
        pathname: "/(app)/(events)/[id]/transactions/[transactionId]/rename",
        params: {
          id: org,
          transactionId: transaction.id,
          transaction: JSON.stringify(transaction),
        },
      });
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
  const isDark = useIsDark();
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

  return (
    <View style={{ marginBottom: 20 }}>
      {title && (
        <Text
          style={{
            color: palette.muted,
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            marginLeft: 2,
          }}
        >
          {title}
        </Text>
      )}

      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          overflow: "hidden",
        }}
      >
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
          ) => {
            const rowContent = (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  gap: 12,
                }}
              >
                <Text
                  style={{ color: subColor, fontSize: 14, flexShrink: 0 }}
                >
                  {label}
                </Text>
                {typeof value === "string" ? (
                  <Text
                    numberOfLines={3}
                    style={{
                      color: themeColors.text,
                      flex: 1,
                      textAlign: "right",
                      fontFamily,
                      fontSize: 14,
                    }}
                    selectable
                  >
                    {value}
                  </Text>
                ) : (
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    {value}
                  </View>
                )}
                {onPress && (
                  <Ionicons
                    name={pressIconName}
                    size={16}
                    color={palette.muted}
                  />
                )}
              </View>
            );

            return (
              <View key={label}>
                {index > 0 && (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: borderColor,
                      marginHorizontal: 14,
                    }}
                  />
                )}
                {onPress ? (
                  <Pressable
                    onPress={onPress}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    {rowContent}
                  </Pressable>
                ) : (
                  rowContent
                )}
              </View>
            );
          },
        )}
      </View>
    </View>
  );
}
