import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import ImageView from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { palette } from "../theme";

interface FileViewerModalProps {
  fileUrl: string | null;
  filename: string | null;
  visible: boolean;
  onRequestClose: () => void;
}

export default function FileViewerModal({
  fileUrl,
  filename,
  visible,
  onRequestClose,
}: FileViewerModalProps) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const insets = useSafeAreaInsets();

  if (!fileUrl) {
    return null;
  }

  const isImage = /\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i.test(fileUrl);

  if (isImage) {
    return (
      <ImageView
        images={[{ uri: fileUrl }]}
        imageIndex={0}
        visible={visible}
        onRequestClose={onRequestClose}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onRequestClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          paddingTop: insets.top,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
          }}
        >
          <TouchableOpacity onPress={onRequestClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "500",
              flex: 1,
              textAlign: "center",
              marginHorizontal: 10,
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {filename || "File"}
          </Text>

          <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <View style={{ flex: 1, backgroundColor: "white" }}>
          {webViewLoading && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "white",
                zIndex: 1,
              }}
            >
              <ActivityIndicator size="large" color={palette.primary} />
              <Text
                style={{
                  marginTop: 10,
                  color: palette.muted,
                  fontSize: 16,
                }}
              >
                Loading file...
              </Text>
            </View>
          )}
          <WebView
            source={{ uri: fileUrl }}
            style={{ flex: 1, backgroundColor: palette.background }}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onError={() => setWebViewLoading(false)}
            startInLoadingState={true}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={true}
          />
        </View>
      </View>
    </Modal>
  );
}
