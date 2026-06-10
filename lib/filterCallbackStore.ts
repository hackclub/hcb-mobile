import { TransactionFilters } from "./organization/useTransactions";

type ApplyCallback = (filters: TransactionFilters) => void;

let pending: ApplyCallback | null = null;

export const filterCallbackStore = {
  register(cb: ApplyCallback) {
    pending = cb;
  },
  apply(filters: TransactionFilters) {
    pending?.(filters);
    pending = null;
  },
  unregister() {
    pending = null;
  },
};
