import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { PropsWithChildren } from "react";
import { Alert, FlatList, Text, TouchableHighlight, View } from "react-native";
import useSWR from "swr";

import Transaction from "../components/Transaction";
import { ReceiptsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import ITransaction from "../lib/types/Transaction";
import { palette } from "../theme";

function ReceiptUploadButton({
  icon,
  onPress,
  children,
}: PropsWithChildren<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}>) {
  const { colors: themeColors } = useTheme();

  return (
    <TouchableHighlight onPress={onPress} style={{ flexBasis: 0, flexGrow: 1 }}>
      <View
        style={{
          backgroundColor: themeColors.card,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
        }}
      >
        <Ionicons
          size={18}
          color={themeColors.text}
          name={icon}
          style={{ marginRight: 10 }}
        />
        <Text style={{ color: themeColors.text }}>{children}</Text>
      </View>
    </TouchableHighlight>
  );
}

type Props = NativeStackScreenProps<
  ReceiptsStackParamList,
  "MissingReceiptList"
>;

export default function ReceiptsPage({ navigation: _navigation }: Props) {
  const { data } = useSWR<{
    data: (ITransaction & { organization: Organization })[];
  }>("/user/transactions/missing_receipt");

  const [status, requestPermission] = ImagePicker.useCameraPermissions();

  const { colors: themeColors } = useTheme();

  return (
    <FlatList
      data={data?.data || []}
      renderItem={({ item }) => (
        <View
          style={{
            marginBottom: 16,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: themeColors.card,
          }}
        >
          <Transaction transaction={item} top hidePendingLabel />
          <View
            style={{
              flexDirection: "row",
              // backgroundColor: "red",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ReceiptUploadButton icon="cloud-upload-outline" onPress={() => {}}>
              Upload receipt
            </ReceiptUploadButton>
            <View
              style={{
                width: 1,
                height: "60%",
                backgroundColor: palette.slate,
              }}
            />
            <ReceiptUploadButton
              icon="camera-outline"
              onPress={async () => {
                if (!status?.granted) {
                  const { granted } = await requestPermission();
                  if (!granted) return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                });

                if (result.canceled) return;

                Alert.alert(result.assets[0].type || "yeah");
              }}
            >
              Take photo
            </ReceiptUploadButton>
            {/* <Ionicons.Button
              name="camera-outline"
              onPress={async () => {
                if (!status?.granted) {
                  const { granted } = await requestPermission();
                  if (!granted) return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                });

                if (result.canceled) return;

                Alert.alert(result.assets[0].type || "yeah");
              }}
              style={{ justifyContent: "center", flexGrow: 1 }}
              backgroundColor={themeColors.card}
              color={themeColors.text}
              borderRadius={0}
            >
              Take photo
            </Ionicons.Button> */}
          </View>
        </View>
      )}
      contentContainerStyle={{ padding: 20 }}
    />
  );
}
