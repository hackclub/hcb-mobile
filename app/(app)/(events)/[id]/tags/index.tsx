import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import TagChip from "@/components/tags/TagChip";
import { Text } from "@/components/Text";
import { parseApiError, showAlert, showDestructiveAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import Tag from "@/lib/types/Tag";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

export default function TagsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const hcb = useClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: tags,
    isLoading,
    mutate: refreshTags,
  } = useOfflineSWR<Tag[]>(`tags?organization_id=${id}`);

  const handleDelete = (tag: Tag) => {
    showDestructiveAlert(
      "Delete tag",
      `Delete "${tag.label}"? It will be removed from all tagged transactions.`,
      "Delete",
      async () => {
        setDeletingId(tag.id);
        try {
          await hcb.delete(`tags/${tag.id}`);
          refreshTags();
        } catch (err) {
          console.error("Tag deletion failed", err, {
            context: { tagId: tag.id, action: "delete_tag" },
          });
          showAlert("Error", await parseApiError(err));
        } finally {
          setDeletingId(null);
        }
      },
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 16,
      }}
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(events)/[id]/tags/new",
            params: { id },
          })
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: palette.primary,
          borderRadius: 14,
          paddingVertical: 16,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
          New tag
        </Text>
      </Pressable>

      {isLoading && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator />
        </View>
      )}

      {!isLoading && (!tags || tags.length === 0) && (
        <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
          <Ionicons name="pricetag-outline" size={40} color={palette.muted} />
          <Text
            style={{ color: palette.muted, fontSize: 15, fontWeight: "600" }}
          >
            No tags yet
          </Text>
          <Text
            style={{ color: palette.muted, fontSize: 13, textAlign: "center" }}
          >
            Create tags to organize and filter transactions.
          </Text>
        </View>
      )}

      {tags && tags.length > 0 && (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {tags.map((tag, index) => (
            <View key={tag.id}>
              {index > 0 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.border,
                    marginHorizontal: 16,
                  }}
                />
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <TagChip tag={tag} />
                <Pressable
                  onPress={() => handleDelete(tag)}
                  disabled={deletingId === tag.id}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    opacity: pressed || deletingId === tag.id ? 0.4 : 1,
                  })}
                >
                  {deletingId === tag.id ? (
                    <ActivityIndicator size={18} color={palette.muted} />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={palette.muted}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
