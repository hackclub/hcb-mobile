import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View, Text, TouchableOpacity, Pressable } from "react-native";

import { StackParamList } from "../../lib/NavigatorParamList";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../theme";

type NavigationProp = NativeStackNavigationProp<StackParamList>;

export default function TapToPayBanner({
  onDismiss,
  orgId,
}: {
  onDismiss: () => void;
  orgId: `org_${string}`;
}) {
  const isDark = useIsDark();
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    navigation.navigate("OrganizationDonation", {
      orgId: orgId,
    });
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? `${palette.primary}20` : palette.primary,
        borderColor: palette.primary,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: palette.primary,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Pressable onPress={handlePress} style={{ flex: 1, marginRight: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Ionicons
            name="card-outline"
            size={20}
            color={isDark ? palette.primary : palette.smoke}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: isDark ? palette.primary : palette.smoke,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Accept Payments with Tap to Pay
          </Text>
        </View>
        <Text
          style={{
            color: isDark ? palette.primary : palette.smoke,
            flex: 1,
            textAlign: "left",
            opacity: 0.9,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Turn your iPhone into a payment terminal and accept contactless
          payments.
        </Text>
      </Pressable>
      <TouchableOpacity
        onPress={onDismiss}
        style={{
          backgroundColor: isDark
            ? `${palette.primary}20`
            : `${palette.smoke}20`,
          borderRadius: 20,
          padding: 4,
          marginLeft: 8,
          zIndex: 1,
        }}
      >
        <Ionicons
          name="close"
          size={20}
          color={isDark ? palette.primary : palette.smoke}
        />
      </TouchableOpacity>
    </View>
  );
}
