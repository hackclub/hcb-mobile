import { Button, Text, View } from "react-native";

import Organization from "../../lib/types/Organization";
import { palette } from "../../theme";

export default function PlaygroundBanner(_props: {
  organization: Organization;
}) {
  return (
    <View
      style={{
        backgroundColor: "rgb(43, 65, 95)",
        padding: 10,
        marginBottom: 20,
        borderRadius: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: palette.smoke, flex: 1 }}>
          To raise & spend money, activate your organization&apos;s account.
        </Text>
        <Button title="Activate" />
      </View>
    </View>
  );
}
