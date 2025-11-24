import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { memo } from "react";
import { TouchableHighlight, View } from "react-native";

import { StackParamList } from "../../lib/NavigatorParamList";
import { getTransactionTitle } from "../../lib/transactionTitle";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import ITransaction, { TransactionType } from "../../lib/types/Transaction";
import User from "../../lib/types/User";
import Transaction from "../transaction/Transaction";

interface TransactionWrapperProps {
  item: ITransaction;
  user: User | undefined;
  organization: Organization | OrganizationExpanded | undefined;
  navigation: NativeStackNavigationProp<StackParamList, "Event">;
  orgId: `org_${string}`;
  index?: number;
  isFirst?: boolean;
  isLast?: boolean;
}

function TransactionWrapper({
  item,
  user,
  organization,
  navigation,
  orgId,
  isFirst = false,
  isLast = false,
}: TransactionWrapperProps) {
  const { colors: themeColors } = useTheme();

  const userinOrganization = Boolean(
    organization &&
      "users" in organization &&
      organization.users.some((u) => u.id === user?.id),
  );

  const canViewTransaction = Boolean(
    item.id && (userinOrganization || user?.auditor),
  );

  const handlePress = () => {
    if (!canViewTransaction) return;

    if (
      item.code === TransactionType.Disbursement &&
      "transfer" in item &&
      item.transfer?.card_grant_id
    ) {
      navigation.navigate("GrantCard", {
        grantId: item.transfer.card_grant_id,
      });
    } else {
      navigation.navigate("Transaction", {
        transactionId: item.id!,
        orgId,
        transaction: item as ITransaction,
        title: getTransactionTitle(item as ITransaction),
      });
    }
  };

  return (
    <View style={{ overflow: "hidden" }}>
      <TouchableHighlight
        onPress={canViewTransaction ? handlePress : undefined}
        underlayColor={themeColors.background}
        activeOpacity={0.7}
        style={{ overflow: "hidden" }}
      >
        <Transaction
          orgId={orgId}
          transaction={item}
          top={isFirst}
          bottom={isLast}
        />
      </TouchableHighlight>
    </View>
  );
}

export default memo(TransactionWrapper, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.user?.id === nextProps.user?.id &&
    prevProps.organization?.id === nextProps.organization?.id
  );
});
