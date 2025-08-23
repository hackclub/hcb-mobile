import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

import IComment from "../../lib/types/Comment";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../theme";
import FileViewerModal from "../FileViewerModal";
import UserMention from "../UserMention";

export default function Comment({ comment }: { comment: IComment }) {
  const { colors: themeColors } = useTheme();
  const [fileViewerVisible, setFileViewerVisible] = useState(false);
  const isDark = useIsDark();

  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();

    if (
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"].includes(
        extension || "",
      )
    ) {
      return "image-outline";
    } else if (["pdf"].includes(extension || "")) {
      return "document-text-outline";
    } else if (["doc", "docx"].includes(extension || "")) {
      return "document-outline";
    } else if (["xls", "xlsx"].includes(extension || "")) {
      return "grid-outline";
    } else if (["ppt", "pptx"].includes(extension || "")) {
      return "easel-outline";
    } else if (["zip", "rar", "7z"].includes(extension || "")) {
      return "archive-outline";
    } else {
      return "document-attach-outline";
    }
  };

  const getFileName = (fileUrl: string): string => {
    return fileUrl.split("/").pop() || "Attachment";
  };

  return (
    <View>
      <View
        style={{
          backgroundColor: themeColors.card,
          borderWidth: 1,
          borderColor: isDark ? "#3B4858" : "#E0E6ED",
          borderRadius: 8,
          padding: 16,
          ...(comment.admin_only && {
            borderColor: "#ff8c37",
            backgroundColor: "#ff8c3708",
            borderWidth: 1.5,
          }),
        }}
      >
        {/* Admin Badge */}
        {comment.admin_only && (
          <View
            style={{
              position: "absolute",
              top: -6,
              right: 12,
              backgroundColor: "#ff8c37",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              zIndex: 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 10,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Admin Only
            </Text>
          </View>
        )}

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
            borderBottomWidth: 1,
            borderColor: isDark ? "#3B4858" : "#E0E6ED",
            paddingBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <UserMention user={comment.user} />

              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                {formatDistanceToNow(parseISO(comment.created_at))} ago
              </Text>
            </View>
          </View>
        </View>

        {/* Comment Content */}
        <Text
          style={{
            color: themeColors.text,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: comment.file ? 12 : 0,
          }}
          selectable
        >
          {comment.content}
        </Text>

        {/* File Attachment */}
        {comment.file && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.background,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: themeColors.border,
              marginTop: 8,
            }}
            onPress={() => setFileViewerVisible(true)}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                backgroundColor: palette.primary + "15",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name={getFileIcon(getFileName(comment.file))}
                size={16}
                color={palette.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: themeColors.text,
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                {getFileName(comment.file)}
              </Text>
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                }}
              >
                Tap to view
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FileViewerModal
        fileUrl={comment.file || null}
        filename={comment.file ? getFileName(comment.file) : null}
        visible={fileViewerVisible}
        onRequestClose={() => setFileViewerVisible(false)}
      />
    </View>
  );
}
