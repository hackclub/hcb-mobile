import { useActionSheet } from "@expo/react-native-action-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

import useClient from "../lib/client";
import { useOffline } from "../lib/useOffline";
import { useIsDark } from "../lib/useColorScheme";

interface ReceiptActionSheetProps {
  orgId: string;
  transactionId: string;
  onUploadComplete?: () => void;
}

export function useReceiptActionSheet({
  orgId,
  transactionId = "",
  onUploadComplete,
}: ReceiptActionSheetProps) {
  const { showActionSheetWithOptions } = useActionSheet();
  const { isOnline, withOfflineCheck } = useOffline();
  const hcb = useClient();
  const isDark = useIsDark();

  const uploadFile = withOfflineCheck(
    async (
      file: {
        uri: string;
        fileName?: string;
        mimeType?: string;
      } | null,
    ) => {
      const body = new FormData();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      body.append("file", {
        uri: file?.uri,
        name: file?.fileName || "receipt.jpg",
        type: file?.mimeType || "image/jpeg",
      });

      if (transactionId) {
        body.append("transaction_id", transactionId)
      }

      try {
        await hcb.post(
          `receipts`,
          {
            body,
          },
        );
        onUploadComplete?.();
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

  const uploadMultipleFiles = withOfflineCheck(
    async (
      files: (
        | ImagePicker.ImagePickerAsset
        | DocumentPicker.DocumentPickerAsset
      )[],
    ) => {
      for (const file of files) {
        const fileName = "name" in file ? file.name : file.fileName;
        await uploadFile({
          uri: file.uri,
          fileName: fileName || undefined,
          mimeType: file.mimeType || undefined,
        });
      }
    },
  );

  const handleActionSheet = withOfflineCheck(() => {
    const options = ["Camera", "Photo Library", "Document", "Cancel"];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        userInterfaceStyle: isDark ? "dark" : "light",
      },
      async (buttonIndex) => {
        if (buttonIndex === 0) {
          // Take a photo
          ImagePicker.requestCameraPermissionsAsync();
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 1,
          });
          if (!result.canceled) {
            await uploadFile({
              uri: result.assets[0].uri,
              fileName: result.assets[0].fileName || undefined,
            });
          }
        } else if (buttonIndex === 1) {
          // Pick from photo library
          ImagePicker.requestMediaLibraryPermissionsAsync();
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 1,
            allowsMultipleSelection: true,
            selectionLimit: 10,
          });
          if (!result.canceled && result.assets.length > 0) {
            await uploadMultipleFiles(result.assets);
          }
        } else if (buttonIndex === 2) {
          // Pick a document
          const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "image/*"],
            copyToCacheDirectory: true,
            multiple: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            await uploadMultipleFiles(result.assets);
          }
        }
      },
    );
  });

  return {
    handleActionSheet,
    isOnline,
  };
}
