import { faPaypal } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import Icon from "@thedev132/hackclub-icons-rn";

import WiseIcon from "@/components/icons/WiseIcon";
import UserAvatar from "@/components/UserAvatar";
import {
  TransactionCardCharge,
  TransactionType,
  TransactionWithoutId,
} from "@/lib/types/Transaction";
import { palette } from "@/styles/theme";

function transactionIconName({
  code,
  ...transaction
}: TransactionWithoutId): string {
  switch (code) {
    case TransactionType.Donation:
    case TransactionType.PartnerDonation:
      return "support";
    case TransactionType.Check:
    case TransactionType.IncreaseCheck:
      return "email";
    case TransactionType.CheckDeposit:
      return "briefcase";
    case TransactionType.Disbursement:
      if (transaction.memo.startsWith("Grant to")) {
        return "purse-fill";
      } else if (transaction.memo === "💰 Hackathon grant from Hack Club") {
        return "purse";
      }
      return transaction.amount_cents > 0 ? "door-enter" : "door-leave";
    case TransactionType.StripeCard:
    case TransactionType.StripeForceCapture:
      return transaction.amount_cents > 0 ? "view-reload" : "card";
    case TransactionType.BankFee:
      return "minus";
    case TransactionType.FeeRevenue:
      return "plus";
    case TransactionType.Invoice:
      return "briefcase";
    case TransactionType.ExpensePayout:
      return "attachment";
    case TransactionType.Wire:
      return "web";
    case TransactionType.Paypal:
      return "paypal";
    case TransactionType.Wise:
      return "wise";
    case TransactionType.AchTransfer:
      return "payment-transfer";
    default:
      return "payment-docs";
  }
}

export default function TransactionIcon({
  transaction,
  hideAvatar,
  hideIcon,
}: {
  transaction: TransactionWithoutId;
  hideAvatar?: boolean;
  hideIcon?: boolean;
}) {
  if (hideIcon) return null;

  const iconName = transactionIconName(transaction);
  const iconColor =
    transaction.appearance === "hackathon_grant"
      ? palette.black
      : palette.muted;

  if (!hideAvatar && transaction.code === TransactionType.StripeCard) {
    return (
      <UserAvatar
        user={(transaction as TransactionCardCharge).card_charge.card.user}
        size={20}
      />
    );
  }

  if (iconName === "paypal") {
    return <FontAwesomeIcon color={iconColor} icon={faPaypal} size={20} />;
  }

  if (iconName === "wise") {
    return <WiseIcon color={iconColor} size={22} />;
  }

  return <Icon glyph={iconName} color={iconColor} size={22} />;
}
