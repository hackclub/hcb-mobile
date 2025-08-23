import { useActionSheet } from "@expo/react-native-action-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { useIsDark } from "../../../lib/useColorScheme";
import { useOffline } from "../../../lib/useOffline";

export type SelectedFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export function useCommentFileActionSheet() {
  const { showActionSheetWithOptions } = useActionSheet();
  const { withOfflineCheck } = useOffline();
  const isDark = useIsDark();

  const handleActionSheet = withOfflineCheck(
    (): Promise<SelectedFile | null> => {
      return new Promise((resolve) => {
        const options = ["Camera", "Photo Library", "Document", "Cancel"];
        const cancelButtonIndex = 3;

        showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            userInterfaceStyle: isDark ? "dark" : "light",
            containerStyle: {
              backgroundColor: isDark ? "#252429" : "white",
            },
            textStyle: {
              color: isDark ? "white" : "black",
            },
          },
          async (buttonIndex) => {
            if (buttonIndex === 0) {
              // Take a photo
              await ImagePicker.requestCameraPermissionsAsync();
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: "images",
                quality: 1,
              });
              if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                resolve({
                  uri: asset.uri,
                  name: asset.fileName || `photo_${Date.now()}.jpg`,
                  mimeType: asset.mimeType || "image/jpeg",
                });
              } else {
                resolve(null);
              }
            } else if (buttonIndex === 1) {
              // Pick from photo library
              await ImagePicker.requestMediaLibraryPermissionsAsync();
              const result = await ImagePicker.launchImageLibraryAsync({
                quality: 1,
                allowsMultipleSelection: false, // Single selection for comments
              });
              if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                resolve({
                  uri: asset.uri,
                  name: asset.fileName || `image_${Date.now()}.jpg`,
                  mimeType: asset.mimeType || "image/jpeg",
                });
              } else {
                resolve(null);
              }
            } else if (buttonIndex === 2) {
              // Pick a document
              const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false, // Single selection for comments
              });
              if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                resolve({
                  uri: asset.uri,
                  name: asset.name,
                  mimeType: asset.mimeType || "application/octet-stream",
                });
              } else {
                resolve(null);
              }
            } else {
              // Cancel
              resolve(null);
            }
          },
        );
      });
    },
  );

  return {
    handleActionSheet,
  };
}
