import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
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
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

import Button from "@/components/Button";
import { Text } from "components/Text";
import { showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";

type CheckImage = { uri: string; fileName?: string; mimeType?: string } | null;

function ImagePickerZone({
  label,
  image,
  onPick,
}: {
  label: string;
  image: CheckImage;
  onPick: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const borderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: palette.muted,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={onPick}
        style={({ pressed }) => ({
          height: 120,
          borderRadius: 14,
          borderWidth: 2,
          borderColor,
          borderStyle: "dashed",
          overflow: "hidden",
          opacity: pressed ? 0.7 : 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.03)",
        })}
      >
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="camera-outline" size={28} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: 14 }}>
              Tap to add {label.toLowerCase()}
            </Text>
          </View>
        )}
        {image && (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Tap to change
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function NewCheckDepositPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const hcb = useClient();
  const { showActionSheetWithOptions } = useActionSheet();

  const [front, setFront] = useState<CheckImage>(null);
  const [back, setBack] = useState<CheckImage>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickImage = (onSelect: (img: CheckImage) => void) => {
    showActionSheetWithOptions(
      {
        options: ["Take Photo", "Choose from Library", "Cancel"],
        cancelButtonIndex: 2,
        userInterfaceStyle: isDark ? "dark" : "light",
      },
      async (index) => {
        if (index === 0) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            showAlert("Permission needed", "Camera access is required to take photos.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            onSelect({ uri: asset.uri, fileName: asset.fileName ?? "check.jpg", mimeType: asset.mimeType ?? "image/jpeg" });
          }
        } else if (index === 1) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            onSelect({ uri: asset.uri, fileName: asset.fileName ?? "check.jpg", mimeType: asset.mimeType ?? "image/jpeg" });
          }
        }
      },
    );
  };

  const handleSubmit = async () => {
    if (!front) {
      showAlert("Missing image", "Please add the front of the check.");
      return;
    }
    if (!back) {
      showAlert("Missing image", "Please add the back of the check.");
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      showAlert("Invalid amount", "Please enter a valid check amount.");
      return;
    }

    setSubmitting(true);
    try {
      const [frontJpeg, backJpeg] = await Promise.all([
        manipulateAsync(front.uri, [], { compress: 0.85, format: SaveFormat.JPEG }),
        manipulateAsync(back.uri, [], { compress: 0.85, format: SaveFormat.JPEG }),
      ]);

      const body = new FormData();
      body.append("front", {
        uri: frontJpeg.uri,
        name: "front.jpeg",
        type: "image/jpeg",
      } as unknown as Blob);
      body.append("back", {
        uri: backJpeg.uri,
        name: "back.jpeg",
        type: "image/jpeg",
      } as unknown as Blob);
      body.append("amount_cents", String(Math.round(parsed * 100)));
      body.append("organization_id", id);

      const response = await hcb
        .post("check_deposits", { body })
        .json<{ id: string }>();

      router.replace({
        pathname: "/(events)/[id]/check-deposits/[depositId]",
        params: { id, depositId: response.id },
      });
    } catch (err) {
      console.error(err);
      let message = "Please check your details and try again.";
      try {
        const body = await (err as { response?: Response }).response?.json();
        if (Array.isArray(body?.messages) && body.messages.length > 0) {
          message = body.messages[0];
        }
      } catch {
        // ignore parse errors, fall back to default message
      }
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Submission failed",
        textBody: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ImagePickerZone
          label="Front of check"
          image={front}
          onPick={() => pickImage(setFront)}
        />

        <ImagePickerZone
          label="Back of check"
          image={back}
          onPick={() => pickImage(setBack)}
        />

        {/* Amount */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: palette.muted,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Amount on check
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.card,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              gap: 6,
            }}
          >
            <Text style={{ color: palette.muted, fontSize: 17, fontWeight: "500" }}>
              $
            </Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor={palette.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                color: themeColors.text,
                fontSize: 17,
              }}
            />
          </View>
        </View>

        <Button
          variant="primary"
          loading={submitting}
          onPress={handleSubmit}
        >
          Submit deposit
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
