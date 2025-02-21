import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNow } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";
import useSWR, { mutate } from "swr";

import AuthContext from "../auth";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import { TransactionCardCharge } from "../lib/types/Transaction";
import p from "../palette";
import { palette } from "../theme";
import { renderMoney } from "../util";

function Transaction({
  transaction,
  onComplete,
}: {
  transaction: TransactionCardCharge & { organization: Organization };
  onComplete: () => void;
}) {
  const { token } = useContext(AuthContext);

  const { colors: themeColors } = useTheme();

  const [loading, setLoading] = useState(false);

  const { showActionSheetWithOptions } = useActionSheet();
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    fileName?: string;
  } | null>(null);

  const uploadReceipt = async () => {
    const body = new FormData();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore

    body.append("file", {
      uri: selectedImage?.uri,
      name: selectedImage?.fileName || "yeet.jpg",
      type: "image/jpeg",
    });

    try {
      await fetch(
        process.env.EXPO_PUBLIC_API_BASE +
          `/organizations/${transaction.organization.id}/transactions/${transaction.id}/receipts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body,
        },
      );
      mutate(
        `organizations/${transaction.organization.id}/transactions/${transaction.id}/receipts`,
      );
      setLoading(false);
      onComplete();
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: "Reciept Uploaded!",
        textBody: "Your reciept has been uploaded successfully.",
      });
    } catch (e) {
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "An error occurred while uploading the reciept.",
      });
    }
  };

  const handleActionSheet = () => {
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
            setSelectedImage({
              uri: result.assets[0].uri,
              fileName: result.assets[0].fileName || "",
            });
            setLoading(true);
            await uploadReceipt();
          }
        } else if (buttonIndex === 1) {
          // Pick from photo library
          ImagePicker.requestMediaLibraryPermissionsAsync();
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            setSelectedImage({
              uri: result.assets[0].uri,
              fileName: result.assets[0].fileName || "",
            });
            setLoading(true);
            await uploadReceipt();
          }
        }
      },
    );
  };

  return (
    <TouchableHighlight
      underlayColor={themeColors.background}
      onPress={handleActionSheet}
    >
      <View
        style={{
          marginBottom: 16,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: themeColors.card,
          flexDirection: "row",
          alignItems: "stretch",
        }}
      >
        <View style={{ flex: 1, padding: 10, gap: 8 }}>
          <Text style={{ color: themeColors.text }}>{transaction.memo}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Text style={{ color: palette.muted }}>
              {renderMoney(Math.abs(transaction.amount_cents))}
            </Text>
            <Text style={{ color: palette.muted }}>&middot;</Text>
            <Text style={{ color: palette.muted }}>
              {formatDistanceToNow(new Date(transaction.card_charge.spent_at))}{" "}
              ago
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: loading ? p.sky["600"] : p.sky["500"],
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            width: 60,
          }}
        >
          {loading ? (
            <ActivityIndicator color={themeColors.text} />
          ) : (
            <Ionicons
              size={26}
              color={themeColors.text}
              name="camera-outline"
            />
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
}

type Props = NativeStackScreenProps<
  ReceiptsStackParamList,
  "MissingReceiptList"
>;

export default function ReceiptsPage({ navigation: _navigation }: Props) {
  const { data, mutate, isLoading } = useSWR<{
    data: (TransactionCardCharge & { organization: Organization })[];
  }>("user/transactions/missing_receipt");

  useFocusEffect(() => {
    mutate();
  });

  const [refreshing] = useState(false);

  const onRefresh = async () => {
    mutate();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (data?.data?.length == 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ marginBottom: 10 }}>
          <Ionicons name="receipt-outline" color={palette.muted} size={60} />
          <Ionicons
            name="checkmark"
            color={p.emerald["400"]}
            size={30}
            style={{
              position: "absolute",
              top: -15,
              left: -15,
            }}
          />
        </View>
        <Text style={{ color: palette.muted }}>No receipts to upload.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data?.data || []}
      renderItem={({ item }) => (
        <Transaction transaction={item} onComplete={() => mutate()} />
      )}
      contentContainerStyle={{ padding: 20 }}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}
