import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useTheme } from "expo-router/react-navigation";
import { TouchableHighlight, View } from "react-native";

import { Text } from "@/components/Text";
import Invitation from "@/lib/types/Invitation";
import { useIsDark } from "@/lib/useColorScheme";
import { palette } from "@/styles/theme";
import { orgColor } from "@/utils/org";

export default function InvitationCard({
  invitation,
  onPress,
}: {
  invitation: Invitation;
  onPress?: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const org = invitation.organization;

  return (
    <TouchableHighlight
      onPress={onPress}
      underlayColor={themeColors.background}
      activeOpacity={0.7}
      style={{
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: palette.primary,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          gap: 12,
        }}
      >
        {org.icon ? (
          <Image
            source={{ uri: org.icon }}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={{ width: 40, height: 40, borderRadius: 8 }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: orgColor(org.id),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
              {org.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: themeColors.text,
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            {org.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}
          >
            {invitation.sender
              ? `${invitation.sender.name} invited you`
              : "You've been invited"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isDark ? palette.muted : palette.slate}
        />
      </View>
    </TouchableHighlight>
  );
}
