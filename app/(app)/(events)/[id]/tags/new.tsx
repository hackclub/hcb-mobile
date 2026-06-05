import { useTheme } from "expo-router/react-navigation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { mutate } from "swr";

import Button from "@/components/Button";
import TagChip, { TAG_COLORS } from "@/components/tags/TagChip";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { TagColor } from "@/lib/types/Tag";
import { palette } from "@/styles/theme";

const COLORS = Object.keys(TAG_COLORS) as TagColor[];

export default function NewTagPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const hcb = useClient();

  const [label, setLabel] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [emoji, setEmoji] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!label.trim()) {
      showAlert("Missing field", "Please enter a tag label.");
      return;
    }

    setSubmitting(true);
    try {
      await hcb.post("tags", {
        json: {
          organization_id: id,
          label: label.trim(),
          color,
          ...(emoji.trim() && { emoji: emoji.trim() }),
        },
      });
      mutate(`tags?organization_id=${id}`);
      router.back();
    } catch (err) {
      console.error("Tag creation failed", err, {
        context: { organizationId: id, action: "create_tag" },
      });
      showAlert("Error", await parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: palette.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  };

  const inputContainerStyle = {
    backgroundColor: themeColors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 14,
            padding: 20,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Preview
          </Text>
          <TagChip
            tag={{ label: label.trim() || "Tag label", color, emoji: emoji.trim() || null }}
          />
        </View>

        {/* Label */}
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Label</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Travel, Equipment"
              placeholderTextColor={palette.muted}
              style={{ color: themeColors.text, fontSize: 16 }}
              autoFocus
              maxLength={50}
            />
          </View>
        </View>

        {/* Color */}
        <View style={{ gap: 10 }}>
          <Text style={labelStyle}>Color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: TAG_COLORS[c],
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: "#fff",
                  shadowColor: color === c ? TAG_COLORS[c] : "transparent",
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                })}
              />
            ))}
          </View>
        </View>

        {/* Emoji */}
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Emoji (optional)</Text>
          <View style={inputContainerStyle}>
            <TextInput
              value={emoji}
              onChangeText={(t) => {
                // keep only the first grapheme cluster (emoji or char)
                const chars = [...t];
                setEmoji(chars.slice(0, 1).join(""));
              }}
              placeholder="🚀"
              placeholderTextColor={palette.muted}
              style={{ color: themeColors.text, fontSize: 22 }}
            />
          </View>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            Shown instead of the color dot on tag chips.
          </Text>
        </View>

        <Button
          variant="primary"
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: 4 }}
        >
          Create tag
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
