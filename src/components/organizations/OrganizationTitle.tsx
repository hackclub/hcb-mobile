import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text } from "react-native";

import Organization from "../../lib/types/Organization";

export default function OrganizationTitle({
  organization,
}: {
  organization?: Organization;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {organization?.icon && (
        <Image
          source={{ uri: organization.icon }}
          cachePolicy="disk"
          style={{ width: 25, height: 25, marginRight: 10, borderRadius: 4 }}
        />
      )}
      <Text
        style={{
          color: themeColors.text,
          fontWeight: "600",
          fontSize: 17,
        }}
      >
        {organization?.name || "Loading..."}
      </Text>
    </View>
  );
}
