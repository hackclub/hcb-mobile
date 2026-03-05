import { TransactionBase } from "../../../lib/types/Transaction";

export type TransactionViewProps<T extends TransactionBase = TransactionBase> =
  {
    transaction: T;
    orgId: string;
  };
