import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { palette } from "../styles/theme";

import Button from "./Button";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (feedback: { category: string; message: string }) => void;
}

const feedbackCategories = [
  { id: "bug", label: "Bug", icon: "bug" as const },
  { id: "feature", label: "Feature Request", icon: "bulb" as const },
  { id: "improvement", label: "Improvement", icon: "construct" as const },
  { id: "other", label: "Other", icon: "chatbox-ellipses" as const },
];

export default function FeedbackModal({
  visible,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("feature");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!feedbackText.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        onSubmit({
          category: selectedCategory,
          message: feedbackText.trim(),
        });
      }

      setFeedbackText("");
      setSelectedCategory("feature");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFeedbackText("");
    setSelectedCategory("feature");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={"padding"}
          style={{ width: "100%", minHeight: "60%" }}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxHeight: "80%",
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="create-outline"
                    size={28}
                    color={palette.primary}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: colors.text,
                    }}
                  >
                    Feedback
                  </Text>
                </View>
                <Pressable onPress={handleClose}>
                  <Ionicons name="close" size={28} color={palette.muted} />
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: 15,
                  color: palette.muted,
                  marginBottom: 20,
                }}
              >
                Help us improve by sharing your thoughts, reporting bugs, or
                suggesting new features.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 12,
                  fontWeight: "600",
                }}
              >
                Category
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {feedbackCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor:
                        selectedCategory === category.id
                          ? palette.primary
                          : "rgba(0, 0, 0, 0.1)",
                      borderWidth: 1,
                      borderColor:
                        selectedCategory === category.id
                          ? palette.primary
                          : "transparent",
                    }}
                  >
                    <Ionicons
                      name={category.icon}
                      size={18}
                      color={
                        selectedCategory === category.id
                          ? "#fff"
                          : palette.muted
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        color:
                          selectedCategory === category.id
                            ? "#fff"
                            : colors.text,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 12,
                  fontWeight: "600",
                }}
              >
                Your Feedback
              </Text>
              <TextInput
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: colors.text,
                  marginBottom: 24,
                  minHeight: 120,
                  textAlignVertical: "top",
                  borderWidth: 1,
                  borderColor: "rgba(0, 0, 0, 0.05)",
                }}
                placeholder="Tell us what's on your mind..."
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={6}
                value={feedbackText}
                onChangeText={setFeedbackText}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    paddingVertical: 14,
                  }}
                  color={colors.text}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  style={{
                    flex: 1,
                    backgroundColor: palette.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                  }}
                  color="#fff"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={!feedbackText.trim() || isSubmitting}
                >
                  Submit
                </Button>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
