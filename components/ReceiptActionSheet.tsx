import { useActionSheet } from "@expo/react-native-action-sheet";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { findNodeHandle } from "react-native";
import { useSWRConfig } from "swr";

import { parseApiError, showFailureAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { invalidateReceiptCaches } from "@/lib/receipts";
import { toast } from "@/lib/toast";
import { useIsDark } from "@/lib/useColorScheme";
import { useOffline } from "@/lib/useOffline";
import { maybeRequestReview } from "@/utils/storeReview";

interface ReceiptActionSheetProps {
  orgId: string;
  transactionId: string;
  transactionMemo?: string;
  enableBinSelection?: boolean;
  onUploadComplete?: () => void;
}

export function useReceiptActionSheet({
  orgId = "",
  transactionId = "",
  transactionMemo,
  enableBinSelection = false,
  onUploadComplete,
}: ReceiptActionSheetProps) {
  const { showActionSheetWithOptions } = useActionSheet();
  const { isOnline, withOfflineCheck } = useOffline();
  const hcb = useClient();
  const isDark = useIsDark();
  const { mutate } = useSWRConfig();

  const chooseFromBin = () => {
    router.push({
      pathname: "/receipt-selection",
      params: {
        transaction: JSON.stringify({
          id: transactionId,
          memo: transactionMemo,
          organization: orgId ? { id: orgId } : undefined,
        }),
      },
    });
  };

  // Posts one receipt and lets failures propagate, so the batch above can
  // report an accurate count instead of silently swallowing them.
  const postReceipt = async (file: {
    uri: string;
    fileName?: string;
    mimeType?: string;
  }) => {
    const body = new FormData();
    body.append("file", {
      uri: file.uri,
      name: file.fileName || "receipt.jpg",
      type: file.mimeType || "image/jpeg",
    } as unknown as Blob);

    if (transactionId) {
      body.append("transaction_id", transactionId);
    }

    await hcb.post(`receipts`, { body });
  };

  /**
   * One toast for the whole batch, carried from spinner to outcome. Previously
   * each file fired its own success toast — ten photos meant ten cards — and
   * nothing at all appeared while the uploads were in flight.
   */
  const uploadFiles = withOfflineCheck(
    async (
      files: {
        uri: string;
        fileName?: string;
        mimeType?: string;
      }[],
    ) => {
      if (!files.length) return;

      const total = files.length;
      const noun = total === 1 ? "receipt" : `${total} receipts`;
      const toastId = toast.loading(`Uploading ${noun}…`);

      let uploaded = 0;
      let lastError: unknown = null;

      for (let i = 0; i < total; i++) {
        if (total > 1) {
          toast.update(toastId, {
            type: "loading",
            title: `Uploading ${noun}…`,
            message: `${i + 1} of ${total}`,
          });
        }
        try {
          await postReceipt(files[i]);
          uploaded += 1;
        } catch (error) {
          lastError = error;
          console.error("Receipt upload failed", error, {
            context: { orgId, transactionId, index: i },
          });
        }
      }

      // Revalidate before reporting success, so the screen behind the toast has
      // already updated by the time the user looks at it.
      await invalidateReceiptCaches(mutate, { orgId, transactionId });
      onUploadComplete?.();

      if (uploaded === total) {
        toast.update(toastId, {
          type: "success",
          title:
            total === 1 ? "Receipt uploaded" : `${total} receipts uploaded`,
        });
        maybeRequestReview();
      } else if (uploaded > 0) {
        toast.update(toastId, {
          type: "warning",
          title: `Uploaded ${uploaded} of ${total}`,
          message: await parseApiError(lastError, "Some receipts failed."),
        });
      } else {
        // Nothing landed. A modal rather than a toast: the user's intent didn't
        // happen and they need to decide whether to retry. Re-uploading is safe.
        toast.dismiss(toastId);
        showFailureAlert(
          total === 1 ? "Upload failed" : "Uploads failed",
          await parseApiError(
            lastError,
            "Please check your connection and try again.",
          ),
          () => uploadFiles(files),
        );
      }
    },
  );

  const uploadPickerAssets = (
    assets: (
      | ImagePicker.ImagePickerAsset
      | DocumentPicker.DocumentPickerAsset
    )[],
  ) =>
    uploadFiles(
      assets.map((file) => ({
        uri: file.uri,
        fileName: ("name" in file ? file.name : file.fileName) || undefined,
        mimeType: file.mimeType || undefined,
      })),
    );

  const handleActionSheet = withOfflineCheck(
    (buttonRef?: React.RefObject<unknown>) => {
      const options = enableBinSelection
        ? [
            "Camera",
            "Photo Library",
            "Document",
            "Choose from Receipt Bin",
            "Cancel",
          ]
        : ["Camera", "Photo Library", "Document", "Cancel"];
      const cancelButtonIndex = options.length - 1;

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
          anchor: buttonRef?.current
            ? (findNodeHandle(buttonRef.current as React.Component) ??
              undefined)
            : undefined,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            ImagePicker.requestCameraPermissionsAsync();
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              quality: 1,
            });
            if (!result.canceled) {
              await uploadPickerAssets(result.assets);
            }
          } else if (buttonIndex === 1) {
            ImagePicker.requestMediaLibraryPermissionsAsync();
            const result = await ImagePicker.launchImageLibraryAsync({
              quality: 1,
              allowsMultipleSelection: true,
              selectionLimit: 10,
            });
            if (!result.canceled && result.assets.length > 0) {
              await uploadPickerAssets(result.assets);
            }
          } else if (buttonIndex === 2) {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "image/*"],
              copyToCacheDirectory: true,
              multiple: true,
            });
            if (!result.canceled && result.assets.length > 0) {
              await uploadPickerAssets(result.assets);
            }
          } else if (buttonIndex === 3 && enableBinSelection) {
            chooseFromBin();
          }
        },
      );
    },
  );

  return {
    handleActionSheet,
    isOnline,
  };
}
