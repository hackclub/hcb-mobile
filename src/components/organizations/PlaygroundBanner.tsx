import { Text, View } from "react-native";

import Organization from "../../lib/types/Organization";
import { palette } from "../../theme";

export default function PlaygroundBanner({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <View
      style={{
        backgroundColor: "rgb(43, 65, 95)",
        borderColor: "rgb(52, 152, 219)", 
        borderWidth: 2,
        borderStyle: "dotted",
        padding: 10,
        marginBottom: 20,
        borderRadius: 8,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: palette.smoke, fontWeight: "bold", marginBottom: 5 }}>
          Playground Mode
        </Text>
        <Text style={{ color: palette.smoke, flex: 1, textAlign: "center" }}>
          To raise & spend money, wait for your organization&apos;s account to be activated by a staff member.
        </Text>
        {/* <Button
          title="Activate"
          disabled={organization.playground_mode_meeting_requested}
        /> */}
      </View>
    </View>
  );
}
