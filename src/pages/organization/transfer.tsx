import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Button as NativeButton, View } from "react-native";

import Button from "../../components/Button";
import { StackParamList } from "../../lib/NavigatorParamList";
import { palette } from "../../theme";

type Props = NativeStackScreenProps<StackParamList, "Transfer">;

export default function TransferPage({ navigation }: Props) {
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <NativeButton
          color={palette.primary}
          title="Cancel"
          onPress={() => navigation.goBack()}
        />
      ),
    });
  }, []);

  const [transferType, setTransferType] = useState<"ach" | "check" | "account">(
    "ach",
  );

  return (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          style={{
            flex: 1,
            backgroundColor:
              transferType == "ach" ? palette.primary : palette.slate,
            borderTopWidth: 0,
          }}
          onPress={() => setTransferType("ach")}
        >
          ACH
        </Button>
        <Button
          style={{
            flex: 1,
            backgroundColor:
              transferType == "check" ? palette.primary : palette.slate,
            borderTopWidth: 0,
          }}
          onPress={() => setTransferType("check")}
        >
          Check
        </Button>
        <Button
          style={{
            flex: 1,
            backgroundColor:
              transferType == "account" ? palette.primary : palette.slate,
            borderTopWidth: 0,
          }}
          onPress={() => setTransferType("account")}
        >
          Account
        </Button>
      </View>
    </View>
  );
}
