import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/Button";
import TagChip from "@/components/tags/TagChip";
import { Text } from "@/components/Text";
import { TransactionFilters } from "@/lib/organization/useTransactions";
import Tag from "@/lib/types/Tag";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette, subTextColor } from "@/styles/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  tags?: Tag[];
}

const EMPTY: TransactionFilters = {};

export default function TransactionFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  tags,
}: Props) {
  const { colors: themeColors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const isDark = useIsDark();

  const subColor = subTextColor(isDark);
  const borderColor = cardBorderColor(isDark);

  const cardStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor,
  };

  // draft state — only committed on Apply
  const [draft, setDraft] = useState<TransactionFilters>(filters);

  const set = (patch: Partial<TransactionFilters>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const handleOpen = () => setDraft(filters);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft(EMPTY);
    onApply(EMPTY);
    onClose();
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: "600" as const,
    color: subColor,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  };

  const inputStyle = {
    color: themeColors.text,
    fontSize: 15,
    flex: 1,
    paddingVertical: 0,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: bottom + 16,
              maxHeight: 600,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: subColor + "55",
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: themeColors.text,
                }}
              >
                Filter transactions
              </Text>
              <Pressable
                onPress={handleClear}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={{ color: palette.primary, fontSize: 15 }}>
                  Clear all
                </Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 16,
                gap: 16,
                paddingBottom: 8,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Search */}
              <View>
                <Text style={labelStyle}>Search</Text>
                <View
                  style={{
                    ...cardStyle,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 10,
                  }}
                >
                  <Ionicons name="search-outline" size={16} color={subColor} />
                  <TextInput
                    value={draft.search ?? ""}
                    onChangeText={(v) => set({ search: v || undefined })}
                    placeholder="Memo, merchant, amount..."
                    placeholderTextColor={subColor}
                    style={inputStyle}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>
              </View>

              {/* Type */}
              <View>
                <Text style={labelStyle}>Type</Text>
                <View
                  style={{
                    ...cardStyle,
                    flexDirection: "row",
                    padding: 4,
                    gap: 2,
                  }}
                >
                  {(
                    [
                      { label: "All", value: undefined },
                      { label: "Expenses", value: "expenses" },
                      { label: "Revenue", value: "revenue" },
                    ] as { label: string; value: TransactionFilters["type"] }[]
                  ).map(({ label, value }) => {
                    const active = draft.type === value;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => set({ type: value })}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 10,
                          alignItems: "center",
                          backgroundColor: active
                            ? isDark
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(0,0,0,0.07)"
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: active ? "600" : "400",
                            color: active ? themeColors.text : subColor,
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date range */}
              <View>
                <Text style={labelStyle}>Date range</Text>
                <View style={{ ...cardStyle, overflow: "hidden" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={draft.startDate ?? ""}
                      onChangeText={(v) => set({ startDate: v || undefined })}
                      placeholder="From YYYY-MM-DD"
                      placeholderTextColor={subColor}
                      style={{ ...inputStyle }}
                    />
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: borderColor,
                      marginHorizontal: 14,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={draft.endDate ?? ""}
                      onChangeText={(v) => set({ endDate: v || undefined })}
                      placeholder="To YYYY-MM-DD"
                      placeholderTextColor={subColor}
                      style={{ ...inputStyle }}
                    />
                  </View>
                </View>
              </View>

              {/* Amount range */}
              <View>
                <Text style={labelStyle}>Amount range</Text>
                <View style={{ ...cardStyle, overflow: "hidden" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: subColor, fontSize: 15 }}>$</Text>
                    <TextInput
                      value={draft.minimumAmount ?? ""}
                      onChangeText={(v) =>
                        set({ minimumAmount: v || undefined })
                      }
                      placeholder="Min amount"
                      placeholderTextColor={subColor}
                      style={inputStyle}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: borderColor,
                      marginHorizontal: 14,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: subColor, fontSize: 15 }}>$</Text>
                    <TextInput
                      value={draft.maximumAmount ?? ""}
                      onChangeText={(v) =>
                        set({ maximumAmount: v || undefined })
                      }
                      placeholder="Max amount"
                      placeholderTextColor={subColor}
                      style={inputStyle}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Tags */}
              {tags && tags.length > 0 && (
                <View>
                  <Text style={labelStyle}>Tag</Text>
                  <View
                    style={{
                      ...cardStyle,
                      padding: 14,
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {tags.map((tag) => (
                      <Pressable
                        key={tag.id}
                        onPress={() =>
                          set({
                            tagId: draft.tagId === tag.id ? undefined : tag.id,
                          })
                        }
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <TagChip tag={tag} active={draft.tagId === tag.id} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Missing receipts */}
              <View>
                <View
                  style={{
                    ...cardStyle,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: themeColors.text, fontSize: 15 }}>
                    Missing receipts only
                  </Text>
                  <Switch
                    value={!!draft.missingReceipts}
                    onValueChange={(v) =>
                      set({ missingReceipts: v || undefined })
                    }
                    trackColor={{ true: palette.primary }}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Apply button */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <Button onPress={handleApply}>Apply filters</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
