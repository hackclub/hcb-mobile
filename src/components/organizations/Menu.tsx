import { Ionicons } from "@expo/vector-icons";
import { MenuView } from "@react-native-menu/menu";
import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { StackParamList } from "../../lib/NavigatorParamList";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import User from "../../lib/types/User";
import * as Haptics from "../../utils/haptics";
import { handleMenuActionEvent, handleMenuActions } from "../../utils/util";

interface MenuProps {
  user: User;
  navigation: NativeStackNavigationProp<StackParamList, "Event">;
  organization: Organization | OrganizationExpanded | undefined;
  supportsTapToPay: boolean | undefined;
}

export default function Menu({
  user,
  navigation,
  organization,
  supportsTapToPay,
}: MenuProps) {
  const scheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const menuActions = useMemo(() => {
    if (!organization || !user) {
      return [];
    }
    return handleMenuActions(
      organization,
      user,
      supportsTapToPay || false,
      scheme || "light",
    );
  }, [organization, user, supportsTapToPay, scheme]);

  if (menuActions.length === 0) {
    return null;
  }
  return (
    <MenuView
      actions={menuActions}
      themeVariant={scheme || undefined}
      onPressAction={({ nativeEvent: { event } }) => {
        Haptics.selectionAsync();
        handleMenuActionEvent(
          event,
          navigation,
          organization,
          supportsTapToPay,
        );
      }}
    >
      <Ionicons.Button
        name="ellipsis-horizontal-circle-outline"
        backgroundColor="transparent"
        size={24}
        color={themeColors.text}
        iconStyle={{ marginRight: 0 }}
      />
    </MenuView>
  );
}
