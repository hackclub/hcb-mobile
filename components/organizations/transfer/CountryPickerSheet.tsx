import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";

import { Text } from "@/components/Text";
import { setPendingCountry } from "@/lib/countryPickerStore";
import { useIsDark } from "@/lib/useColorScheme";
import { WIRE_COUNTRIES } from "@/lib/wireCountryFields";
import { cardBorderColor, palette, radii, subTextColor } from "@/styles/theme";

export default function CountryPickerSheet() {
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const subColor = subTextColor(isDark);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WIRE_COUNTRIES;
    return WIRE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = (code: string) => {
    setPendingCountry(code);
    router.back();
  };

  return (
    // No backgroundColor: the formSheet's own material shows through, matching
    // the translucent native header above it.
    <View style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        data={results}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{ height: 1, backgroundColor: cardBorderColor(isDark) }}
          />
        )}
        ListHeaderComponent={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: themeColors.card,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: cardBorderColor(isDark),
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Ionicons name="search-outline" size={16} color={subColor} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={subColor}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={{
                color: themeColors.text,
                fontSize: 15,
                flex: 1,
                paddingVertical: 0,
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <Text
            style={{
              color: subColor,
              fontSize: 15,
              textAlign: "center",
              paddingTop: 24,
            }}
          >
            No countries match &quot;{query}&quot;.
          </Text>
        }
        renderItem={({ item }) => {
          const isSelected = item.code === selected;
          return (
            <Pressable
              onPress={() => handleSelect(item.code)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  flex: 1,
                  color: themeColors.text,
                  fontSize: 16,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {item.name}
              </Text>
              <Text style={{ color: palette.muted, fontSize: 14 }}>
                {item.code}
              </Text>
              {isSelected ? (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={themeColors.primary}
                />
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
