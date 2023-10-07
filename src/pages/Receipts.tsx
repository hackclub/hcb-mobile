import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNow } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { PropsWithChildren, useContext } from "react";
import { Alert, FlatList, Text, TouchableHighlight, View } from "react-native";
import useSWR from "swr";

import AuthContext from "../auth";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import { TransactionCardCharge } from "../lib/types/Transaction";
import { palette } from "../theme";
import { renderMoney } from "../util";

function ReceiptUploadButton({
  icon,
}: PropsWithChildren<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
}>) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: "#338eda",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <Ionicons size={26} color={themeColors.text} name={icon} />
      {/* <Text style={{ color: themeColors.text, fontSize: 12 }}>Upload</Text> */}
    </View>
  );
}

type Props = NativeStackScreenProps<
  ReceiptsStackParamList,
  "MissingReceiptList"
>;

export default function ReceiptsPage({ navigation: _navigation }: Props) {
  const { data, mutate } = useSWR<{
    data: (TransactionCardCharge & { organization: Organization })[];
  }>("/user/transactions/missing_receipt");

  const [status, requestPermission] = ImagePicker.useCameraPermissions();
  const { token } = useContext(AuthContext);

  const { colors: themeColors } = useTheme();

  useFocusEffect(() => {
    mutate();
  });

  return (
    <FlatList
      data={data?.data || []}
      renderItem={({ item }) => (
        <TouchableHighlight
          underlayColor={themeColors.background}
          onPress={async () => {
            if (!status?.granted) {
              const { granted } = await requestPermission();
              if (!granted) return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

            if (result.canceled || result.assets.length == 0) return;
            const asset = result.assets[0];

            const body = new FormData();

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            body.append("file", {
              uri: asset.uri,
              name: asset.fileName || "yeet.jpg",
              type: "image/jpeg",
            });

            try {
              await fetch(
                process.env.EXPO_PUBLIC_API_BASE +
                  `/organizations/${item.organization.id}/transactions/${item.id}/receipts`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body,
                },
              );
            } catch (e) {
              Alert.alert("Something went wrong.");
            }

            await mutate();

            Alert.alert("Receipt uploaded!");
          }}
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
              <Text style={{ color: themeColors.text }}>{item.memo}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Text style={{ color: palette.muted }}>
                  {renderMoney(Math.abs(item.amount_cents))}
                </Text>
                <Text style={{ color: palette.muted }}>&middot;</Text>
                <Text style={{ color: palette.muted }}>
                  {formatDistanceToNow(new Date(item.card_charge.spent_at))} ago
                </Text>
              </View>
            </View>
            <ReceiptUploadButton icon="camera-outline">
              Take photo
            </ReceiptUploadButton>
          </View>
        </TouchableHighlight>
      )}
      contentContainerStyle={{ padding: 20 }}
    />
  );
}
