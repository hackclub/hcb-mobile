import { MenuAction, MenuView } from "@expo/ui/community/menu";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { showAlert } from "@/lib/alertUtils";
import { OrgPolicy } from "@/lib/policies";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import * as Haptics from "@/utils/haptics";

function getMenuActions(
  organization: Organization | OrganizationExpanded | undefined,
  user: User | undefined,
  supportsTapToPay: boolean,
  scheme: string,
): MenuAction[] {
  if (!organization || !user) {
    return [];
  }
  const menuActions: MenuAction[] = [];
  const iconColor = scheme === "dark" ? "white" : "black";

  const orgExpanded =
    "users" in organization ? (organization as OrganizationExpanded) : null;
  const policy = orgExpanded ? new OrgPolicy(user, orgExpanded) : null;

  const fallbackAccess = user.auditor || user.admin;

  if (policy ? policy.accountNumber() : fallbackAccess) {
    menuActions.push({
      id: "accountNumber",
      title: "Account Details",
      image: "creditcard.and.123",
      imageColor: iconColor,
    });
  }

  if (policy?.createTransfer()) {
    menuActions.push({
      id: "transfer",
      title: "Transfer Money",
      image: "dollarsign.circle",
      imageColor: iconColor,
    });
  }

  if (policy?.invoices() && !organization.playground_mode) {
    menuActions.push({
      id: "invoices",
      title: "Invoices",
      image: "doc.text",
      imageColor: iconColor,
    });
  }

  if (policy ? policy.team() : fallbackAccess) {
    menuActions.push({
      id: "team",
      title: "Manage Team",
      image: "person.2.badge.gearshape",
      imageColor: iconColor,
    });
  }

  if (supportsTapToPay && policy?.donationPage() && policy?.show()) {
    menuActions.push({
      id: "donation",
      title: "Collect Donations",
      image: "dollarsign.circle",
      imageColor: iconColor,
    });
  }

  return menuActions;
}

function handleMenuAction(
  event: string,
  organization: Organization | OrganizationExpanded | undefined,
  supportsTapToPay?: boolean,
) {
  if (!organization?.id) return;

  const baseParams = {
    id: organization.id,
    fallbackData: JSON.stringify(organization),
  };

  switch (event) {
    case "accountNumber":
      router.push({
        pathname: "/(events)/[id]/account-numbers",
        params: baseParams,
      });
      return;
    case "transfer":
      router.push({
        pathname: "/(events)/[id]/transfer",
        params: {
          ...baseParams,
          organization: JSON.stringify(organization),
        },
      });
      return;
    case "invoices":
      router.push({
        pathname: "/(events)/[id]/invoices",
        params: baseParams,
      });
      return;
    case "team":
      router.push({
        pathname: "/(events)/[id]/team",
        params: baseParams,
      });
      return;
    case "donation":
      if (!supportsTapToPay) {
        showAlert(
          "Unsupported Device",
          "Collecting donations is only supported on iOS 16.4 and later. Please update your device to use this feature.",
        );
        return;
      }
      router.push({
        pathname: "/(events)/[id]/donations",
        params: baseParams,
      });
      return;
    default:
      return;
  }
}

interface MenuProps {
  user: User;
  organization: Organization | OrganizationExpanded | undefined;
  supportsTapToPay: boolean | undefined;
}

export default function Menu({
  user,
  organization,
  supportsTapToPay,
}: MenuProps) {
  const scheme = useColorScheme();
  const { colors: themeColors } = useTheme();
  const menuActions = useMemo(
    () =>
      getMenuActions(
        organization,
        user,
        supportsTapToPay || false,
        scheme || "light",
      ),
    [organization, user, supportsTapToPay, scheme],
  );

  if (menuActions.length === 0) {
    return null;
  }
  return (
    <MenuView
      actions={menuActions}
      onPressAction={({ nativeEvent: { event } }) => {
        Haptics.selectionAsync();
        handleMenuAction(event, organization, supportsTapToPay);
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
