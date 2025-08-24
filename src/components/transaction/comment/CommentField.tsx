import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import useSWR, { mutate, useSWRConfig } from "swr";

import useClient from "../../../lib/client";
import User from "../../../lib/types/User";
import { palette } from "../../../theme";
import Button from "../../Button";
import UserAvatar from "../../UserAvatar";

import {
  useCommentFileActionSheet,
  SelectedFile,
} from "./CommentFileActionSheet";

interface CommentFieldProps {
  orgId: string;
  transactionId: string;
}

export default function CommentField({
  orgId,
  transactionId,
}: CommentFieldProps) {
  const { colors: themeColors } = useTheme();
  const { data: user } = useSWR<User>("user");
  const [comment, setComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const hcb = useClient();
  const { handleActionSheet } = useCommentFileActionSheet();
  const { mutate: globalMutate } = useSWRConfig();

  const pickFile = async () => {
    try {
      const result = await handleActionSheet();
      if (result) {
        setSelectedFile(result);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const submitComment = async () => {
    if (!comment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append("content", comment.trim());

      if (adminOnly) {
        body.append("admin_only", "true");
      }

      if (selectedFile) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        body.append("file", {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        });
      }

      await hcb.post(
        `organizations/${orgId}/transactions/${transactionId}/comments`,
        {
          body,
        },
      );

      setComment("");
      setSelectedFile(null);
      setAdminOnly(false);

      const commentKey = `organizations/${orgId}/transactions/${transactionId}/comments`;
      await Promise.all([
        mutate(commentKey),
        globalMutate(commentKey),
        globalMutate(
          (key) =>
            typeof key === "string" &&
            key.includes(`/transactions/${transactionId}/comments`),
        ),
      ]);

      Toast.show({
        title: "Comment added",
        type: ALERT_TYPE.SUCCESS,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View style={{ paddingVertical: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <UserAvatar user={user} />
        <Text
          style={{ fontWeight: "500", fontSize: 16, color: themeColors.text }}
        >
          {user.name}
        </Text>
      </View>

      <TextInput
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          minHeight: 80,
          fontSize: 16,
          borderColor: themeColors.border,
          backgroundColor: themeColors.card,
          color: themeColors.text,
        }}
        placeholder="Add a comment..."
        placeholderTextColor={palette.muted}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {user?.admin && (
        <Pressable
          onPress={() => setAdminOnly(!adminOnly)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "#ff8c37",
            borderStyle: "dashed",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#ff8c3710",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              color: "#ff8c37",
              flex: 1,
            }}
          >
            Admin only comment
          </Text>
          <View
            style={{
              width: 22,
              height: 22,
              borderWidth: 2,
              borderColor: "#ff8c37",
              borderRadius: 4,
              backgroundColor: adminOnly ? "#ff8c37" : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 12,
            }}
          >
            {adminOnly && (
              <Text
                style={{ color: "white", fontSize: 14, fontWeight: "bold" }}
              >
                ✓
              </Text>
            )}
          </View>
        </Pressable>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: "#348EDA",
            borderStyle: "dashed",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignItems: "center",
            backgroundColor: "transparent",
          }}
          onPress={selectedFile ? removeFile : pickFile}
        >
          <Text style={{ color: "#348EDA", fontSize: 14, fontWeight: "500" }}>
            {selectedFile ? "Remove file" : "Choose file"}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 14, color: palette.muted }}>
          {selectedFile ? selectedFile.name : "No file chosen"}
        </Text>
      </View>
      <Button
        onPress={submitComment}
        disabled={isSubmitting}
        style={{ backgroundColor: "#3199EE", paddingVertical: 12 }}
      >
        Add comment
      </Button>
    </View>
  );
}
