import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ConnectTapToPayParams,
  PaymentIntent,
  PaymentMethodType,
  Reader,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import * as Device from "expo-device";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Button as NativeButton,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ExpoTtpEdu = Platform.OS === "ios" ? require("expo-ttp-edu") : null;

import Button from "@/components/Button";
import {
  FormField,
  FormSection,
  ReadOnlyField,
  ToggleField,
} from "@/components/organizations/transfer/TransferFormUI";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { setPaymentData } from "@/lib/paymentStore";
import Organization from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useLocation } from "@/lib/useLocation";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { cardBorderColor, palette } from "@/styles/theme";
import { selectionAsync } from "@/utils/haptics";

const MAX_DONATION_AMOUNT = 9999.99;

// TODO: fetch the actual Stripe Terminal location from the organization's
// Stripe account instead of using this hardcoded value.
const STRIPE_TERMINAL_LOCATION_ID = "tml_FWRkngENcVS5Pd";

export default function Page() {
  const { id, orgSlug } = useLocalSearchParams<{
    id: string;
    orgSlug: string;
  }>();
  const { colors } = useTheme();
  const hcb = useClient();
  const navigation = useNavigation();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const isInitialRender = useRef(true);
  useEffect(() => {
    isInitialRender.current = false;
  }, []);

  const [step, setStep] = useState<"amount" | "details">("amount");
  const [amount, setAmount] = useState("$");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isTaxDeductable, setIsTaxDeductable] = useState(false);

  const value = parseFloat(amount.replace("$", "0"));

  useEffect(() => {
    navigation.setOptions({
      title: step === "details" ? "Donor Details" : "New Donation",
      headerLeft:
        step === "details"
          ? () =>
              Platform.OS === "android" ? (
                <View style={{ marginRight: 20 }}>
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={colors.text}
                    onPress={() => setStep("amount")}
                  />
                </View>
              ) : (
                <NativeButton
                  title="Back"
                  color={colors.text}
                  onPress={() => setStep("amount")}
                />
              )
          : undefined,
    });
  }, [step, navigation, colors.text]);

  const isDark = useIsDark();
  const { accessDenied } = useLocation();
  const { data: organization } = useOfflineSWR<Organization>(
    `organizations/${id}`,
  );

  const { isInitialized: isStripeInitialized, discoveredReaders } =
    useStripeTerminalInit({
      organizationId: id,
      enabled: true,
      enableReaderPreConnection: true,
      enableSoftwareUpdates: false,
    });

  const [reader, setReader] = useState<Reader.Type | undefined>(
    discoveredReaders.length > 0 ? discoveredReaders[0] : undefined,
  );
  const readerRef = useRef<Reader.Type | undefined>(reader);
  const [isConnectingReader, setIsConnectingReader] = useState(false);
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);

  const {
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
    discoverReaders,
    connectReader: connectReaderTapToPay,
    disconnectReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: Reader.Type[]) => {
      if (!reader && readers.length > 0) setReader(readers[0]);
    },
  });
  const isSimulator = __DEV__ && !Device.isDevice;

  useEffect(() => {
    readerRef.current = reader;
  }, [reader]);

  useEffect(() => {
    if (discoveredReaders.length > 0 && !reader) {
      setReader(discoveredReaders[0]);
    }
  }, [discoveredReaders, reader]);

  useEffect(() => {
    (async () => {
      const storedOrgId = await AsyncStorage.getItem("lastConnectedOrgId");
      if (connectedReader && storedOrgId !== id) {
        try {
          await disconnectReader();
        } catch (e) {
          console.error("Error disconnecting reader on page load", e, {
            context: { orgId: id, action: "disconnect_reader" },
          });
        }
      }
    })();
  }, [connectedReader, disconnectReader, id]);

  useEffect(() => {
    (async () => {
      try {
        if (
          discoverReaders &&
          isStripeInitialized &&
          discoveredReaders.length === 0
        ) {
          await discoverReaders({ discoveryMethod: "tapToPay" });
        }
      } catch (error) {
        console.error("Error discovering readers", error, {
          context: { orgId: id, action: "discover_readers" },
        });
      }
    })();
  }, [discoverReaders, id, isStripeInitialized, discoveredReaders.length]);

  useEffect(() => {
    const getDidOnboarding = async () => {
      try {
        const didOnboarding = await AsyncStorage.getItem("ttpDidOnboarding");
        if (didOnboarding !== "true") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          ExpoTtpEdu.showTapToPayEducation({
            uiMode: isDark ? "dark" : "light",
          });
          await AsyncStorage.setItem("ttpDidOnboarding", "true");
        }
      } catch (error) {
        console.error("Error in tap-to-pay onboarding", error, {
          context: { action: "ttp_onboarding" },
        });
      }
    };

    if (Platform.OS === "ios") {
      getDidOnboarding();
    }
  }, [isDark]);

  async function handleRequestLocation() {
    await Linking.openSettings();
  }

  useEffect(() => {
    if (accessDenied) {
      showAlert(
        "Access to location",
        "To use the app, you need to allow the use of your device location.",
        [
          {
            text: "Activate",
            onPress: handleRequestLocation,
          },
        ],
      );
    }
  }, [accessDenied]);

  async function connectReader(selectedReader: Reader.Type) {
    if (!isStripeInitialized) {
      showAlert(
        "Payment System Error",
        "Payment system is not ready. Please try again.",
      );
      return false;
    }

    try {
      const { error } = await connectReaderTapToPay({
        discoveryMethod: "tapToPay",
        reader: selectedReader,
        locationId: STRIPE_TERMINAL_LOCATION_ID,
        merchantDisplayName: organization?.name || "HCB",
      } as ConnectTapToPayParams);

      if (error) {
        if (
          (error as { code?: string }).code == "AlreadyConnectedToReader" ||
          (error as { code?: string }).code ==
            "INTEGRATION_ERROR.ALREADY_CONNECTED_TO_READER"
        ) {
          return true;
        }
        console.error("connectReader error", error, {
          context: { orgId: id, action: "connect_reader" },
        });
        showAlert(
          "Connection Error",
          "Failed to connect to Tap to Pay reader. Please try again.",
        );
        return false;
      }

      await AsyncStorage.setItem("lastConnectedOrgId", id);
      return true;
    } catch (error) {
      if (
        (error as { code?: string }).code == "AlreadyConnectedToReader" ||
        (error as { code?: string }).code ==
          "INTEGRATION_ERROR.ALREADY_CONNECTED_TO_READER"
      ) {
        return true;
      }
      console.error("connectReader error", error, {
        context: { orgId: id, action: "connect_reader" },
      });
      showAlert(
        "Connection Error",
        "Failed to connect to Tap to Pay reader. Please try again.",
      );
      return false;
    }
  }

  async function ensureReaderConnected(): Promise<boolean> {
    if (connectedReader) return true;

    setIsConnectingReader(true);
    try {
      const waitForReader = async (timeoutMs = 10000, pollInterval = 300) => {
        const maxAttempts = Math.ceil(timeoutMs / pollInterval);
        let attempts = 0;
        while (attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, pollInterval));
          if (readerRef.current) return true;
          attempts++;
        }
        return false;
      };

      if (reader) {
        return await connectReader(reader);
      }

      if (discoveredReaders.length > 0) {
        return await connectReader(discoveredReaders[0]);
      }

      if (!isStripeInitialized) {
        showAlert(
          "Payment System Error",
          "Payment system is not ready. Please try again.",
        );
        return false;
      }

      const readers = await discoverReaders({
        discoveryMethod: "tapToPay",
      });

      if (
        (readers.error as { code?: string } | undefined)?.code ===
        "AlreadyConnectedToReader"
      ) {
        return true;
      }

      const found = await waitForReader();
      if (found && readerRef.current) {
        return await connectReader(readerRef.current);
      }

      console.error("No reader found", readers);
      showAlert(
        "No reader found",
        "No Tap to Pay reader was found. Please make sure your device supports Tap to Pay and try again.",
      );
      return false;
    } finally {
      setIsConnectingReader(false);
    }
  }

  const createDonation = async () => {
    try {
      if (value <= 0) {
        showAlert("Error creating donation", "Amount must be greater than 0.");
        return "";
      }
      const response = await hcb.post(`organizations/${id}/donations`, {
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
        id,
        amount: value * 100,
      });
      throw error;
    }
  };

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
            context: { orgId: id, action: "collect_payment" },
          },
        );
        return false;
      }

      const { error } = await collectPaymentMethod({
        paymentIntent: localPayment,
      });
      if (error) {
        console.error("collectPaymentMethod error", error, {
          context: { orgId: id, action: "collect_payment" },
        });
        return false;
      }
      output = (await confirmPayment(localPayment)) ?? false;
    } catch (error) {
      console.error("collectPayment error", error, {
        context: { orgId: id, action: "collect_payment" },
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
            context: { orgId: id, action: "confirm_payment" },
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
        context: { orgId: id, action: "confirm_payment" },
      });
      success = false;
    }
    return success;
  }

  async function paymentIntent({ donation_id }: { donation_id: string }) {
    try {
      const { error, paymentIntent } = await createPaymentIntent({
        amount: Number((value * 100).toFixed()),
        currency: "usd",
        paymentMethodTypes: [PaymentMethodType.CardPresent],
        offlineBehavior: "prefer_online",
        captureMethod: "automatic",
        metadata: {
          donation_id,
          donation: "true",
          event_id: id,
        },
        statementDescriptor: `HCB DONATION`.substring(0, 22),
      });
      if (error) {
        console.error("createPaymentIntent error", error, {
          context: { orgId: id, donation_id, action: "payment_intent" },
        });
        return false;
      }
      setPaymentData({
        paymentIntent,
        collectPayment: async () => collectPayment(paymentIntent),
        name,
        email,
        slug: orgSlug || "",
      });
      router.push({
        pathname: "/[id]/donations/process",
        params: { id },
      });
      return paymentIntent;
    } catch (error) {
      console.error("paymentIntent error", error, {
        context: { orgId: id, donation_id: "", action: "payment_intent" },
      });
    }
  }

  const submitDonation = async () => {
    if (isSimulator) {
      const mockPayment = {
        amount: Math.round(value * 100),
      } as PaymentIntent.Type;
      setPaymentData({
        paymentIntent: mockPayment,
        collectPayment: async () => {
          return new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(true), 2000),
          );
        },
        name: name || "Dev Test User",
        email: email || "dev@example.com",
        slug: orgSlug || "test-org",
      });
      router.push({
        pathname: "/[id]/donations/process",
        params: { id },
      });
      return;
    }
    setIsSubmittingDonation(true);
    try {
      const connected = await ensureReaderConnected();
      if (!connected) return;

      const donation_id = await createDonation();
      await paymentIntent({ donation_id });
    } catch (error) {
      console.error("createDonation error", error, {
        context: {
          orgId: id,
          amount: value * 100,
          action: "create_donation",
        },
      });
      showAlert(
        "Error creating donation",
        await parseApiError(error, "Please try again."),
      );
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const goToDetails = () => {
    if (value <= 0) {
      showAlert("Error creating donation", "Amount must be greater than 0.");
      return;
    }
    setStep("details");
  };

  if (step === "amount") {
    return (
      <Animated.View
        key="amount"
        style={{ flex: 1 }}
        entering={
          isInitialRender.current ? undefined : SlideInLeft.duration(220)
        }
        exiting={SlideOutLeft.duration(220)}
      >
        <AmountStep
          amount={amount}
          setAmount={setAmount}
          bottomInset={bottomInset}
          onContinue={goToDetails}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      key="details"
      style={{ flex: 1 }}
      entering={SlideInRight.duration(220)}
      exiting={SlideOutRight.duration(220)}
    >
      <DetailsStep
        amount={amount}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        isTaxDeductable={isTaxDeductable}
        setIsTaxDeductable={setIsTaxDeductable}
        bottomInset={bottomInset}
        onEditAmount={() => setStep("amount")}
        onSubmit={submitDonation}
        isSubmitting={isSubmittingDonation}
        isConnectingReader={isConnectingReader}
      />
    </Animated.View>
  );
}

function AmountStep({
  amount,
  setAmount,
  bottomInset,
  onContinue,
}: {
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  bottomInset: number;
  onContinue: () => void;
}) {
  const { colors } = useTheme();
  const [error, setError] = useState(false);

  const flashError = () => {
    setError(true);
    setTimeout(() => setError(false), 200);
  };

  const pressDigit = (digit: number) => {
    if (
      parseFloat(amount.replace("$", "0") + digit) > MAX_DONATION_AMOUNT ||
      (amount === "$" && digit === 0) ||
      amount[amount.length - 3] === "."
    ) {
      flashError();
    } else {
      setAmount(amount + digit);
    }
  };

  const pressDecimal = () => {
    if (amount.includes(".") || amount === "$") {
      flashError();
    } else {
      setAmount(amount + ".");
    }
  };

  const pressBackspace = () => {
    if (amount === "$") {
      flashError();
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        padding: 20,
        paddingBottom: bottomInset + 16,
      }}
    >
      <Text
        style={{
          color: error ? palette.primary : colors.text,
          fontSize: 72,
          textTransform: "uppercase",
          textAlign: "center",
          marginTop: 16,
        }}
      >
        {amount}
        {amount === "$" && <Text style={{ fontSize: 72 }}>0</Text>}
        {amount[amount.length - 1] === "." && (
          <Text style={{ color: palette.muted }}>00</Text>
        )}
        {amount[amount.length - 2] === "." && (
          <Text style={{ color: palette.muted }}>0</Text>
        )}
      </Text>

      <View style={{ flex: 1, justifyContent: "center", marginTop: 24 }}>
        <NumberPad
          onPressDigit={pressDigit}
          onPressDecimal={pressDecimal}
          onPressBackspace={pressBackspace}
        />
      </View>

      <Button
        onPress={onContinue}
        style={{ width: "100%", paddingVertical: 16 }}
        fontSize={17}
      >
        Continue
      </Button>
    </View>
  );
}

const KEY_DIAMETER = 84;

function NumberPad({
  onPressDigit,
  onPressDecimal,
  onPressBackspace,
}: {
  onPressDigit: (digit: number) => void;
  onPressDecimal: () => void;
  onPressBackspace: () => void;
}) {
  const { colors } = useTheme();
  const isDark = useIsDark();

  const Key = ({
    label,
    icon,
    onPress,
  }: {
    label?: string;
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
  }) => (
    <Pressable
      onPress={() => {
        selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        width: KEY_DIAMETER,
        height: KEY_DIAMETER,
        borderRadius: KEY_DIAMETER / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? cardBorderColor(isDark) : "transparent",
      })}
    >
      {icon ? (
        <Ionicons name={icon} size={26} color={colors.text} />
      ) : (
        <Text
          style={{
            color: colors.text,
            fontSize: 32,
            textAlign: "center",
            fontFamily: "JetBrainsMono-Regular",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={{ alignSelf: "center", width: 320, gap: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Key label="1" onPress={() => onPressDigit(1)} />
        <Key label="2" onPress={() => onPressDigit(2)} />
        <Key label="3" onPress={() => onPressDigit(3)} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Key label="4" onPress={() => onPressDigit(4)} />
        <Key label="5" onPress={() => onPressDigit(5)} />
        <Key label="6" onPress={() => onPressDigit(6)} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Key label="7" onPress={() => onPressDigit(7)} />
        <Key label="8" onPress={() => onPressDigit(8)} />
        <Key label="9" onPress={() => onPressDigit(9)} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Key label="." onPress={onPressDecimal} />
        <Key label="0" onPress={() => onPressDigit(0)} />
        <Key icon="backspace-outline" onPress={onPressBackspace} />
      </View>
    </View>
  );
}

function AmountSummary({
  amount,
  onPress,
}: {
  amount: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <ReadOnlyField
        label="Donation amount"
        value={amount === "$" ? "$0" : amount}
        secondary="Edit"
      />
    </Pressable>
  );
}

function DetailsStep({
  amount,
  name,
  setName,
  email,
  setEmail,
  isTaxDeductable,
  setIsTaxDeductable,
  bottomInset,
  onEditAmount,
  onSubmit,
  isSubmitting,
  isConnectingReader,
}: {
  amount: string;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  isTaxDeductable: boolean;
  setIsTaxDeductable: Dispatch<SetStateAction<boolean>>;
  bottomInset: number;
  onEditAmount: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isConnectingReader: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: bottomInset + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 24 }}>
          <AmountSummary amount={amount} onPress={onEditAmount} />

          <FormSection title="Donor information">
            <FormField
              label="Name"
              optional
              value={name}
              onChangeText={setName}
              placeholder="Anonymous"
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect={false}
            />
            <FormField
              label="Email"
              optional
              description="A receipt will be sent here if provided."
              value={email}
              onChangeText={setEmail}
              placeholder="donor@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ToggleField
              label="Receiving goods or services"
              description="Check this if the donor received something of value in exchange for this donation."
              value={isTaxDeductable}
              onValueChange={setIsTaxDeductable}
            />
          </FormSection>

          <Button
            onPress={onSubmit}
            style={{ width: "100%", paddingVertical: 16 }}
            fontSize={17}
            loading={isSubmitting}
          >
            {isConnectingReader ? "Connecting..." : "Create Donation"}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
