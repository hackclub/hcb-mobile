import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { StackParamList } from "../../../lib/NavigatorParamList";
import { TransactionBase } from "../../../lib/types/Transaction";

export type TransactionViewProps<T extends TransactionBase = TransactionBase> =
  {
    transaction: T;
    orgId: string;
    navigation: NativeStackNavigationProp<StackParamList, "Transaction">;
  };
