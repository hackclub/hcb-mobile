import { MenuAction } from "@react-native-menu/menu";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Merchant, Category } from "@thedev132/yellowpages";
import words from "lodash/words";
import { ALERT_TYPE, Dialog } from "react-native-alert-notification";

import { StackParamList } from "../lib/NavigatorParamList";
import Organization, { OrganizationExpanded } from "../lib/types/Organization";
import ITransaction, {
  TransactionType,
  TransactionWithoutId,
} from "../lib/types/Transaction";
import User from "../lib/types/User";
import { palette } from "../styles/theme";

export function renderMoney(cents: number) {
  return (
    (cents < 0 ? "-" : "") +
    "$" +
    (Math.abs(cents) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })
  );
}

export function renderDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC", // Prevent JS from doing timezone conversion
  });
}

export function statusColor(status: string) {
  if (status == "deposited" || status == "completed") {
    return palette.success;
  } else if (status == "in_transit" || status == "issued") {
    return palette.info;
  } else if (status == "rejected") {
    return palette.primary;
  } else {
    return palette.muted;
  }
}

export function orgColor(orgId: string) {
  const colors = [
    "#ec3750",
    "#ff8c37",
    "#f1c40f",
    "#33d6a6",
    "#5bc0de",
    "#338eda",
    "#a633d6",
  ];

  return colors[Math.floor(orgId.charCodeAt(4) % colors.length)];
}

export function redactedCardNumber(last4?: string) {
  return `•••• •••• •••• ${last4 || "••••"}`;
}

export function renderCardNumber(number: string) {
  return words(number, /\d{4}/g).join(" ");
}

export const normalizeSvg = (
  svg: string,
  width: number,
  height: number,
  scaleFactor: number = 1.25,
): string => {
  return svg.replace(
    "<svg",
    `<svg preserveAspectRatio="xMinYMin slice" viewBox="0 0 ${width / scaleFactor} ${height / scaleFactor}"`,
  );
};

export function organizationOrderEqual(a: Organization[], b: Organization[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

export const formatMerchantNames = async (
  merchantIds: string[] | undefined,
) => {
  if (!merchantIds || merchantIds.length === 0) {
    return "All";
  }

  try {
    await Merchant.initialize();

    const merchantNames: string[] = [];
    const validIds = merchantIds.filter((id): id is string => !!id);
    const unnamedCount = validIds.filter((id) => {
      const merchant = Merchant.lookup({ networkId: id });
      if (merchant.inDataset()) {
        const name = merchant.getName();
        if (name && !merchantNames.includes(name)) {
          merchantNames.push(name);
        }
        return false;
      }
      return true;
    }).length;

    // Add unnamed merchants count if any
    if (unnamedCount > 0) {
      merchantNames.push(`Unnamed Merchants (${unnamedCount})`);
    }

    return merchantNames.join(", ");
  } catch (error) {
    console.error("Error formatting merchant names", error, {
      context: { merchantIds: merchantIds },
    });
    return "Loading...";
  }
};

export const formatCategoryNames = async (
  categoryIds: string[] | undefined,
) => {
  await Category.initialize();
  if (!categoryIds || categoryIds.length === 0) {
    return "All";
  }

  try {
    const categoryNames: string[] = [];
    const validIds = categoryIds.filter((id): id is string => !!id);
    const unnamedCount = validIds.filter((id) => {
      const category = Category.lookup({ key: id });
      if (category.inDataset()) {
        const name = category.getName();
        if (name && !categoryNames.includes(name)) {
          categoryNames.push(name);
        }
        return false;
      }
      return true;
    }).length;

    if (unnamedCount > 0) {
      categoryNames.push(`Unnamed Categories (${unnamedCount})`);
    }

    return categoryNames.join(", ");
  } catch (error) {
    console.error("Error formatting category names", error, {
      context: { categoryIds: categoryIds },
    });
    return "Loading...";
  }
};

export function addPendingFeeToTransactions(
  transactions: ITransaction[],
  organization: Organization | OrganizationExpanded | undefined,
): TransactionWithoutId[] {
  if (
    transactions.length > 0 &&
    organization &&
    "fee_balance_cents" in organization &&
    organization.fee_balance_cents > 0
  ) {
    return [
      {
        amount_cents: -organization.fee_balance_cents,
        code: TransactionType.BankFee,
        date: "",
        pending: true,
        memo: "FISCAL SPONSORSHIP",
        has_custom_memo: false,
        declined: false,
        missing_receipt: false,
        lost_receipt: false,
      },
      ...transactions,
    ];
  } else {
    return transactions;
  }
}

export function handleMenuActions(
  organization: Organization | OrganizationExpanded | undefined,
  user: User | undefined,
  supportsTapToPay: boolean,
  scheme: string,
): MenuAction[] {
  if (!organization || !user) {
    return [];
  }
  const menuActions: MenuAction[] = [];
  const isManager =
    "users" in organization &&
    organization.users.some((u) => u.id === user?.id && u.role === "manager");
  const isAuditor = user.auditor;
  const userinOrganization =
    "users" in organization &&
    organization.users.some((u) => u.id === user?.id);
  const playgroundMode = organization.playground_mode;
  const donationPageAvailable = organization.donation_page_available;

  if (userinOrganization || isAuditor) {
    menuActions.push({
      id: "accountNumber",
      title: "Account Details",
      image: "creditcard.and.123",
      imageColor: scheme === "dark" ? "white" : "black",
    });

    if (isManager && !playgroundMode) {
      menuActions.push({
        id: "transfer",
        title: "Transfer Money",
        image: "dollarsign.circle",
        imageColor: scheme === "dark" ? "white" : "black",
      });
    }

    menuActions.push({
      id: "team",
      title: "Manage Team",
      image: "person.2.badge.gearshape",
      imageColor: scheme === "dark" ? "white" : "black",
    });

    if (
      !playgroundMode &&
      supportsTapToPay &&
      donationPageAvailable &&
      (userinOrganization || user.admin)
    ) {
      menuActions.push({
        id: "donation",
        title: "Collect Donations",
        image: "dollarsign.circle",
        imageColor: scheme === "dark" ? "white" : "black",
      });
    }
  }
  return menuActions;
}

export function handleMenuActionEvent(
  event: string,
  navigation: NativeStackNavigationProp<StackParamList, "Event">,
  organization: Organization | OrganizationExpanded | undefined,
  supportsTapToPay: boolean | undefined,
) {
  if (!organization) {
    return;
  }
  switch (event) {
    case "accountNumber":
      navigation.navigate("AccountNumber", {
        orgId: organization.id,
        organization: organization as OrganizationExpanded,
      });
      break;
    case "team":
      navigation.navigate("OrganizationTeam", {
        orgId: organization.id,
      });
      break;
    case "donation":
      if (supportsTapToPay) {
        navigation.navigate("OrganizationDonation", {
          orgId: organization.id,
        });
      } else {
        Dialog.show({
          type: ALERT_TYPE.DANGER,
          title: "Unsupported Device",
          textBody:
            "Collecting donations is only supported on iOS 16.4 and later. Please update your device to use this feature.",
          button: "Ok",
        });
      }
      break;
    case "transfer":
      navigation.navigate("Transfer", {
        organization: organization,
      });
      break;
    default:
      break;
  }
}
