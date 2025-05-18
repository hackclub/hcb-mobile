import {
  connectActionSheet,
  useActionSheet,
} from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useTheme } from "@react-navigation/native";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useContext, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import ImageView from "react-native-image-viewing";
import Animated, { Easing, withTiming, Layout } from "react-native-reanimated";
import useSWR from "swr";

import AuthContext from "../../auth";
import { StackParamList } from "../../lib/NavigatorParamList";
import Receipt from "../../lib/types/Receipt";
import Transaction from "../../lib/types/Transaction";
import { useOffline } from "../../lib/useOffline";
import { palette } from "../../theme";

function ZoomAndFadeIn() {
  "worklet";
  const animations = {
    opacity: withTiming(1, { duration: 300 }),
    transform: [
      {
        scale: withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.back(2)),
        }),
      },
    ],
  };
  const initialValues = {
    opacity: 0,
    transform: [{ scale: 0.5 }],
  };
  return {
    initialValues,
    animations,
  };
}
const transition = Layout.duration(300).easing(Easing.out(Easing.quad));

function ReceiptList({ transaction }: { transaction: Transaction }) {
  const { params } = useRoute<RouteProp<StackParamList, "Transaction">>();
  const {
    data: receipts,
    isLoading,
    mutate,
  } = useSWR<Receipt[]>(
    `organizations/${params.orgId}/transactions/${transaction.id}/receipts`,
  );

  const { colors: themeColors } = useTheme();
  const { tokens } = useContext(AuthContext);
  const { isOnline, withOfflineCheck } = useOffline();

  const { showActionSheetWithOptions } = useActionSheet();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [ImageViewerIndex, setImageViewerIndex] = useState(0);

  const uploadReceipt = withOfflineCheck(
    async (
      selectedImage: {
        uri: string;
        fileName?: string;
      } | null,
    ) => {
      const body = new FormData();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore

      body.append("file", {
        uri: selectedImage?.uri,
        name: selectedImage?.fileName || "skibidi",
        type: "image/jpeg",
      });

      try {
        await fetch(
          process.env.EXPO_PUBLIC_API_BASE +
            `/organizations/${params.orgId}/transactions/${transaction.id}/receipts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokens?.accessToken}`,
            },
            body,
          },
        );
        mutate();
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: "Receipt Uploaded!",
          textBody: "Your receipt has been uploaded successfully.",
        });
      } catch (e) {
        Toast.show({
          type: ALERT_TYPE.DANGER,
          title: "Failed to upload receipt",
          textBody: "Please try again later.",
        });
      }
    },
  );

  const handleActionSheet = withOfflineCheck(() => {
    const options = ["Camera", "Photo Library", "Cancel"];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (buttonIndex) => {
        if (buttonIndex === 0) {
          // Take a photo
          ImagePicker.requestCameraPermissionsAsync();
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            await uploadReceipt({
              uri: result.assets[0].uri,
              fileName: result.assets[0].fileName || undefined,
            });
          }
        } else if (buttonIndex === 1) {
          // Pick from photo library
          ImagePicker.requestMediaLibraryPermissionsAsync();
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            await uploadReceipt({
              uri: result.assets[0].uri,
              fileName: result.assets[0].fileName || undefined,
            });
          }
        }
      },
    );
  });

  return (
    <View style={{ marginBottom: 30 }}>
      <Text
        style={{
          color: palette.muted,
          fontSize: 12,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Receipts
      </Text>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {receipts?.map((receipt) => (
          <TouchableOpacity
            key={receipt.id}
            onPress={() => {
              setImageViewerIndex(receipts.indexOf(receipt));
              setIsImageViewerVisible(true);
            }}
          >
            <Animated.View key={receipt.id} entering={ZoomAndFadeIn}>
              <Image
                source={receipt.preview_url}
                style={{
                  width: 150,
                  height: 200,
                  backgroundColor: themeColors.card,
                  borderRadius: 8,
                }}
                contentFit="contain"
              />
              <Text
                style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}
              >
                Added {formatDistanceToNowStrict(parseISO(receipt.created_at))}{" "}
                ago
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}

        <ImageView
          images={
            receipts?.map((receipt) => {
              const isImage = /\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i.test(
                receipt.url || "",
              );
              return { uri: isImage ? receipt.url : receipt.preview_url };
            }) || []
          }
          imageIndex={ImageViewerIndex}
          visible={isImageViewerVisible}
          onRequestClose={() => setIsImageViewerVisible(false)}
        />

        <TouchableOpacity onPress={handleActionSheet} disabled={!isOnline}>
          <Animated.View
            style={{
              width: 150,
              height: 200,
              borderRadius: 8,
              backgroundColor: themeColors.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isOnline ? 1 : 0.7,
            }}
            layout={transition}
          >
            {isLoading && !transaction.missing_receipt ? (
              <ActivityIndicator color={palette.muted} />
            ) : (
              <>
                <Ionicons
                  name="add-circle-outline"
                  color={palette.muted}
                  size={36}
                />
                <Text style={{ color: palette.muted, marginTop: 10 }}>
                  Add Receipt
                </Text>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const connectedApp = connectActionSheet(ReceiptList);
export default connectedApp;
