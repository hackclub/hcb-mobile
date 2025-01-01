import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Button as NativeButton, View, ScrollView, Platform } from "react-native";

import Button from "../../components/Button";
import HCBTransferScreen from "../../components/organizations/transfer/HCBTransfer";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import { palette } from "../../theme";

type Props = NativeStackScreenProps<StackParamList, "Transfer">;

export default function TransferPage({ navigation, route }: Props) {
  const { organization } = route.params as { organization: OrganizationExpanded }; // Grab the organization value from the route params

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={{ marginRight: Constants.platform?.android ? 15 : 0 }}>
          <NativeButton
            color={palette.primary}
            title="Cancel"
            onPress={() => navigation.goBack()}
          />
        </View>
      ),
    });
  }, []);

  const [transferType, setTransferType] = useState<"ach" | "check" | "hcb">("hcb");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior for platform
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        {/* Transfer Type Buttons */}
        {/* <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "hcb" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("hcb")}
          >
            HCB
          </Button>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "ach" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("ach")}
          >
            ACH
          </Button>
          <Button
            style={{
              flex: 1,
              backgroundColor: transferType === "check" ? palette.primary : palette.slate,
              borderTopWidth: 0,
            }}
            onPress={() => setTransferType("check")}
          >
            Check
          </Button>
        </View> */}

        {/* Display transfer screen based on transfer type */}
        {transferType === "hcb" && <HCBTransferScreen organization={organization} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
