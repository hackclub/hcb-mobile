import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  PaymentIntent,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import Icon from "@thedev132/hackclub-icons-rn";
import { useRef, useState } from "react";
import {
  Text,
  View,
  TextInput,
  Keyboard as RNKeyboard,
  TouchableWithoutFeedback,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { StackParamList } from "../../lib/NavigatorParamList";
import { palette } from "../../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "NewDonation">;

export default function NewDonationPage({
  route: {
    params: { orgId, orgSlug },
  },
  navigation,
}: Props) {
  const { colors } = useTheme();
  const hcb = useClient();

  const [amount, setAmount] = useState("$");
  const value = parseFloat(amount.replace("$", "0"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isTaxDeductable, setIsTaxDeductable] = useState(false);
  const emailRef = useRef<TextInput>(null);

  const {
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal();

  const createDonation = async () => {
    try {
      if (value <= 0) {
        showAlert("Error creating donation", "Amount must be greater than 0.");
        return "";
      }
      const response = await hcb.post(`organizations/${orgId}/donations`, {
        json: {
          amount_cents: value * 100,
          name,
          email,
          tax_deductable: isTaxDeductable,
        },
      });
      const data = (await response.json()) as { id: string };
      return data.id;
    } catch (error) {
      console.error("Error creating donation", error, {
        orgId,
        amount: value * 100,
      });
      throw error;
    }
  };

  async function paymentIntent({ donation_id }: { donation_id: string }) {
    try {
      const { error, paymentIntent } = await createPaymentIntent({
        amount: Number((value * 100).toFixed()),
        currency: "usd",
        paymentMethodTypes: ["card_present"],
        offlineBehavior: "prefer_online",
        captureMethod: "automatic",
        metadata: {
          donation_id,
          donation: "true",
          event_id: orgId,
        },
        statementDescriptor: `HCB DONATION`.substring(0, 22),
      });
      if (error) {
        console.error("createPaymentIntent error", error, {
          context: { orgId, donation_id, action: "payment_intent" },
        });
        return false;
      }
      navigation.navigate("ProcessDonation", {
        orgId,
        payment: paymentIntent,
        collectPayment: async () => {
          return await collectPayment(paymentIntent);
        },
        name,
        email,
        slug: orgSlug || "",
      });
      return paymentIntent;
    } catch (error) {
      console.error("paymentIntent error", error, {
        context: { orgId, donation_id, action: "payment_intent" },
      });
    }
  }

  async function collectPayment(
    localPayment: PaymentIntent.Type,
  ): Promise<boolean> {
    let output: boolean;
    try {
      if (!collectPaymentMethod) {
        console.error(
          "collectPaymentMethod not available",
          new Error("Method not initialized"),
          {
            context: { orgId, action: "collect_payment" },
          },
        );
        return false;
      }

      const { error } = await collectPaymentMethod({
        paymentIntent: localPayment,
      });
      if (error) {
        console.error("collectPaymentMethod error", error, {
          context: { orgId, action: "collect_payment" },
        });
        showAlert(
          "Error collecting payment",
          "Failed to collect payment. Please try again. Error: " +
            error.message,
        );
        return false;
      }
      output = (await confirmPayment(localPayment)) ?? false;
    } catch (error) {
      console.error("collectPayment error", error, {
        context: { orgId, action: "collect_payment" },
      });
      output = false;
    }
    return output;
  }

  async function confirmPayment(localPayment: PaymentIntent.Type) {
    let success;
    try {
      if (!confirmPaymentIntent) {
        console.error(
          "confirmPaymentIntent not available",
          new Error("Method not initialized"),
          {
            context: { orgId, action: "confirm_payment" },
          },
        );
        return false;
      }

      const { error } = await confirmPaymentIntent({
        paymentIntent: localPayment,
      });
      if (error) {
        return;
      }
      success = true;
    } catch (error) {
      console.error("confirmPayment error", error, {
        context: { orgId, action: "confirm_payment" },
      });
      success = false;
    }
    return success;
  }

  // Dev mode check
  const isDevMode = __DEV__ && !connectedReader;
  const bottomTabBarHeight = useBottomTabBarHeight();

  return (
    <TouchableWithoutFeedback onPress={() => RNKeyboard.dismiss()}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: bottomTabBarHeight + 16,
          flexGrow: 1,
        }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            padding: 20,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flex: 1,
            width: "100%",
          }}
        >
          {/* Fields */}
          <View style={{ width: "100%", gap: 12, marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
              }}
            >
              <Icon glyph="person" size={26} color={palette.muted} />
              <TextInput
                style={{
                  color: colors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  flex: 1,
                }}
                selectTextOnFocus
                clearButtonMode="while-editing"
                value={name}
                autoCapitalize="words"
                onChangeText={setName}
                autoComplete="off"
                autoCorrect={false}
                placeholder="Donor name (optional)"
                placeholderTextColor={palette.muted}
                returnKeyType="next"
                onSubmitEditing={() => {
                  emailRef.current?.focus();
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
              }}
            >
              <Icon glyph="email" size={24} color={palette.muted} />
              <TextInput
                style={{
                  color: colors.text,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  flex: 1,
                }}
                selectTextOnFocus
                clearButtonMode="while-editing"
                placeholder="Email for receipt (optional)"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                ref={emailRef}
              />
            </View>

            {/* Receiving Goods Toggle */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                backgroundColor: colors.card,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 12,
                gap: 12,
              }}
              onPress={() => setIsTaxDeductable(!isTaxDeductable)}
              activeOpacity={0.7}
            >
              <Icon
                glyph={isTaxDeductable ? "checkmark" : "checkbox"}
                size={26}
                color={isTaxDeductable ? palette.primary : palette.muted}
              />
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>
                Receiving goods or services
              </Text>
            </TouchableOpacity>
          </View>

          {/* Keyboard */}
          <View style={{ flex: 1, width: "100%", marginTop: 8 }}>
            <Keyboard amount={amount} setAmount={setAmount} />
          </View>

          <Button
            onPress={async () => {
              if (value <= 0) {
                showAlert(
                  "Error creating donation",
                  "Amount must be greater than 0.",
                );
                return;
              }
              if (isDevMode) {
                // In dev mode, navigate with mock payment data
                navigation.navigate("ProcessDonation", {
                  orgId,
                  payment: {
                    amount: Math.round(value * 100),
                  } as PaymentIntent.Type,
                  collectPayment: async () => {
                    // Mock payment function - simulates success after 2 seconds
                    return new Promise((resolve) =>
                      setTimeout(() => resolve(true), 2000),
                    );
                  },
                  name: name || "Dev Test User",
                  email: email || "dev@example.com",
                  slug: orgSlug || "test-org",
                });
                return;
              }
              try {
                const donation_id = await createDonation();
                await paymentIntent({ donation_id });
              } catch (error) {
                console.error("createDonation error", error, {
                  context: {
                    orgId,
                    amount: value * 100,
                    action: "create_donation",
                  },
                });
                showAlert("Error creating donation", "Please try again.");
              }
            }}
            style={{
              width: "100%",
              marginTop: 12,
              marginBottom: 0,
              paddingVertical: 16,
            }}
            fontSize={17}
          >
            Create Donation
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

interface KeyboardProps {
  amount: string;
  setAmount: (value: string) => void;
}

interface NumberProps {
  number?: number;
  symbol?: string;
  onPress?: () => void;
}

const Keyboard = ({ amount, setAmount }: KeyboardProps) => {
  const [error, setError] = useState(false);
  const theme = useTheme();

  function pressNumber(amount: string, number: number) {
    if (
      parseFloat(amount.replace("$", "0") + number) > 9999.99 ||
      (amount == "$" && number == 0) ||
      amount[amount.length - 3] == "."
    ) {
      setError(true);
      setTimeout(() => setError(false), 200);
    } else {
      setAmount(amount + number);
    }
  }

  function pressDecimal(amount: string) {
    if (amount.includes(".") || amount == "$") {
      setError(true);
      setTimeout(() => setError(false), 200);
    } else {
      setAmount(amount + ".");
    }
  }

  function pressBackspace(amount: string) {
    if (amount == "$") {
      setError(true);
      setTimeout(() => setError(false), 200);
    } else {
      setAmount(amount.slice(0, amount.length - 1));
    }
  }

  const Number = ({ number, symbol, onPress }: NumberProps) => (
    <Text
      style={{
        color: theme.colors.text,
        fontSize: 26,
        textAlign: "center",
        fontFamily: "JetBrainsMono-Regular",
        flexGrow: 1,
        paddingVertical: 6,
      }}
      onPress={() => {
        if (onPress) {
          onPress();
        } else if (number !== undefined) {
          pressNumber(amount, number as number);
        }
      }}
    >
      {number}
      {symbol}
    </Text>
  );

  return (
    <View
      style={{
        width: "100%",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-around",
      }}
    >
      <Text
        style={{
          color: error ? palette.primary : theme.colors.text,
          paddingBottom: 10,
          paddingHorizontal: 10,
          fontSize: 72,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {amount}
        {amount == "$" && <Text>0</Text>}
        {amount[amount.length - 1] == "." && (
          <Text style={{ color: palette.muted }}>00</Text>
        )}
        {amount[amount.length - 2] == "." && (
          <Text style={{ color: palette.muted }}>0</Text>
        )}
      </Text>
      <View>
        <View style={{ flexDirection: "row", paddingBottom: 16 }}>
          <Number number={1} />
          <Number number={2} />
          <Number number={3} />
        </View>
        <View
          style={{ flexDirection: "row", paddingTop: 12, paddingBottom: 12 }}
        >
          <Number number={4} />
          <Number number={5} />
          <Number number={6} />
        </View>
        <View
          style={{ flexDirection: "row", paddingTop: 12, paddingBottom: 12 }}
        >
          <Number number={7} />
          <Number number={8} />
          <Number number={9} />
        </View>
        <View
          style={{ flexDirection: "row", paddingTop: 12, paddingBottom: 12 }}
        >
          <Number symbol={"."} onPress={() => pressDecimal(amount)} />
          <Number number={0} />
          <Number symbol={"←"} onPress={() => pressBackspace(amount)} />
        </View>
      </View>
    </View>
  );
};
