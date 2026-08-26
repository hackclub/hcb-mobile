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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ExpoTtpEdu = Platform.OS === "ios" ? require("expo-ttp-edu") : null;

import Button from "@/components/Button";
import {
  FooterNote,
  FormField,
  FormSection,
  ReadOnlyField,
  ToggleField,
} from "@/components/organizations/transfer/TransferFormUI";
import { Text } from "@/components/Text";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { CollectPaymentResult, setPaymentData } from "@/lib/paymentStore";
import {
  describeTerminalError,
  TerminalErrorLike,
} from "@/lib/stripeTerminalErrors";
import Organization from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useLocation } from "@/lib/useLocation";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { useStripeTerminalInit } from "@/lib/useStripeTerminalInit";
import { cardBorderColor, palette, radii } from "@/styles/theme";
import {
  centsToAmountEntry,
  DonationPrefill,
  parseDonationPrefill,
} from "@/utils/donationLink";
import { renderMoney } from "@/utils/format";
import { selectionAsync } from "@/utils/haptics";

const MAX_DONATION_AMOUNT = 9999.99;

// Comfortably longer than the 10s `waitForReader` poll below, so a slow-but-
// working discovery still succeeds and only a genuinely wedged SDK trips this.
const READER_DISCOVERY_TIMEOUT_MS = 20000;

function sanitizePrefill(prefill: DonationPrefill): DonationPrefill {
  if (
    prefill.amountCents !== undefined &&
    prefill.amountCents > MAX_DONATION_AMOUNT * 100
  ) {
    return { ...prefill, amountCents: undefined };
  }
  return prefill;
}

function amountToNumber(formatted: string): number {
  const digits = formatted.replace(/\$/g, "");
  return digits === "" ? 0 : parseFloat(digits);
}

// TODO: fetch the actual Stripe Terminal location from the organization's
// Stripe account instead of using this hardcoded value.
const STRIPE_TERMINAL_LOCATION_ID = "tml_FWRkngENcVS5Pd";

export default function Page() {
  const params = useLocalSearchParams<{
    id: string;
    orgSlug?: string;
    amount?: string;
    name?: string;
    email?: string;
    message?: string;
    goods?: string;
  }>();
  const { id, orgSlug } = params;
  const prefillRef = useRef<DonationPrefill | null>(null);
  if (prefillRef.current === null) {
    prefillRef.current = sanitizePrefill(parseDonationPrefill(params));
  }
  const prefill = prefillRef.current;

  const { colors } = useTheme();
  const hcb = useClient();
  const navigation = useNavigation();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [step, setStep] = useState<"amount" | "details">(
    prefill.amountCents === undefined ? "amount" : "details",
  );
  const [amount, setAmount] = useState(centsToAmountEntry(prefill.amountCents));
  const [name, setName] = useState(prefill.name ?? "");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [message, setMessage] = useState(prefill.message ?? "");
  const [isReceivingGoods, setIsReceivingGoods] = useState(
    prefill.receivingGoods ?? false,
  );

  const value = amountToNumber(amount);

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
          context: {
            orgId: id,
            action: "connect_reader",
            errorCode: (error as TerminalErrorLike).code,
          },
        });
        const copy = describeTerminalError(error as TerminalErrorLike, {
          title: "Connection Error",
          message: "Failed to connect to Tap to Pay reader. Please try again.",
        });
        showAlert(copy.title, copy.message);
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
        context: {
          orgId: id,
          action: "connect_reader",
          errorCode: (error as TerminalErrorLike).code,
        },
      });
      const copy = describeTerminalError(error as TerminalErrorLike, {
        title: "Connection Error",
        message: "Failed to connect to Tap to Pay reader. Please try again.",
      });
      showAlert(copy.title, copy.message);
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

      // Cap discovery. This await had no bound, so if the Terminal SDK never
      // settled the promise, `submitDonation`'s `finally` never ran and the
      // button span forever with no alert and no way forward.
      const readers = await Promise.race([
        discoverReaders({ discoveryMethod: "tapToPay" }),
        new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), READER_DISCOVERY_TIMEOUT_MS),
        ),
      ]);

      if (!readers) {
        console.error(
          "discoverReaders timed out",
          new Error("Reader discovery exceeded timeout"),
          { context: { orgId: id, action: "discover_readers" } },
        );
        showAlert(
          "Tap to Pay unavailable",
          "Setting up Tap to Pay took too long. Please try again.",
        );
        return false;
      }

      const discoveryError = readers.error as TerminalErrorLike | undefined;

      if (discoveryError?.code === "AlreadyConnectedToReader") {
        return true;
      }

      const found = await waitForReader();
      if (found && readerRef.current) {
        return await connectReader(readerRef.current);
      }

      console.error("No reader found", readers, {
        context: {
          orgId: id,
          action: "discover_readers",
          errorCode: discoveryError?.code,
        },
      });
      const copy = describeTerminalError(discoveryError, {
        title: "No reader found",
        message:
          "No Tap to Pay reader was found. Please make sure your device supports Tap to Pay and try again.",
      });
      showAlert(copy.title, copy.message);
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
          amount_cents: Math.round(value * 100),
          name,
          email,
          message,
          tax_deductible: !isReceivingGoods,
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

  function paymentFailure(
    error: unknown,
    fallbackMessage: string,
  ): CollectPaymentResult {
    return {
      success: false,
      error: describeTerminalError(error as TerminalErrorLike, {
        title: "Payment Failed",
        message: fallbackMessage,
      }),
    };
  }

  async function collectPayment(
    localPayment: PaymentIntent.Type,
  ): Promise<CollectPaymentResult> {
    try {
      if (!collectPaymentMethod) {
        console.error(
          "collectPaymentMethod not available",
          new Error("Method not initialized"),
          {
            context: { orgId: id, action: "collect_payment" },
          },
        );
        return paymentFailure(
          null,
          "The payment system isn't ready. Go back and start the donation again.",
        );
      }

      const { error } = await collectPaymentMethod({
        paymentIntent: localPayment,
      });
      if (error) {
        console.error("collectPaymentMethod error", error, {
          context: {
            orgId: id,
            action: "collect_payment",
            errorCode: (error as TerminalErrorLike).code,
          },
        });
        return paymentFailure(
          error,
          "The card couldn't be read. Please try again or use the QR code instead.",
        );
      }
      return await confirmPayment(localPayment);
    } catch (error) {
      console.error("collectPayment error", error, {
        context: {
          orgId: id,
          action: "collect_payment",
          errorCode: (error as TerminalErrorLike).code,
        },
      });
      return paymentFailure(
        error,
        "The payment couldn't be processed. Please try again or use the QR code instead.",
      );
    }
  }

  async function confirmPayment(
    localPayment: PaymentIntent.Type,
  ): Promise<CollectPaymentResult> {
    try {
      if (!confirmPaymentIntent) {
        console.error(
          "confirmPaymentIntent not available",
          new Error("Method not initialized"),
          {
            context: { orgId: id, action: "confirm_payment" },
          },
        );
        return paymentFailure(
          null,
          "The payment system isn't ready. Go back and start the donation again.",
        );
      }

      const { error } = await confirmPaymentIntent({
        paymentIntent: localPayment,
      });
      if (error) {
        console.error("confirmPaymentIntent error", error, {
          context: {
            orgId: id,
            action: "confirm_payment",
            errorCode: (error as TerminalErrorLike).code,
          },
        });
        return paymentFailure(
          error,
          "The payment couldn't be completed. Please try again or use the QR code instead.",
        );
      }
      return { success: true };
    } catch (error) {
      console.error("confirmPayment error", error, {
        context: {
          orgId: id,
          action: "confirm_payment",
          errorCode: (error as TerminalErrorLike).code,
        },
      });
      return paymentFailure(
        error,
        "The payment couldn't be completed. Please try again or use the QR code instead.",
      );
    }
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
        // Used to return silently: the spinner stopped, nothing navigated, and
        // the screen just sat there looking untouched.
        showAlert(
          "Couldn't start the payment",
          error.message || "Please try again.",
        );
        return false;
      }
      setPaymentData({
        paymentIntent,
        collectPayment: async () => collectPayment(paymentIntent),
        name,
        email,
        slug: orgSlug || organization?.slug || "",
        message,
        receivingGoods: isReceivingGoods,
      });
      router.push({
        pathname: "/[id]/donations/process",
        params: { id },
      });
      return paymentIntent;
    } catch (error) {
      console.error("paymentIntent error", error, {
        context: { orgId: id, donation_id, action: "payment_intent" },
      });
      showAlert(
        "Couldn't start the payment",
        await parseApiError(error, "Please try again."),
      );
      return false;
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
          return new Promise<CollectPaymentResult>((resolve) =>
            setTimeout(() => resolve({ success: true }), 2000),
          );
        },
        name: name || "Dev Test User",
        email: email || "dev@example.com",
        slug: orgSlug || organization?.slug || "test-org",
        message,
        receivingGoods: isReceivingGoods,
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
      // createDonation resolves to "" on the invalid-amount path (it alerts on
      // its own). Continuing would open a Stripe PaymentIntent tagged with an
      // empty donation_id.
      if (!donation_id) return;
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

  // A `/donations/start` link that carries every field is a fully specified
  // donation, so it collects payment without making the organizer re-tap
  // through screens they have nothing left to fill in. Anything less than a
  // complete prefill falls back to the normal flow.
  const canAutoSubmit =
    prefill.amountCents !== undefined &&
    !!prefill.name &&
    !!prefill.email &&
    !!prefill.message;
  const submitDonationRef = useRef(submitDonation);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    submitDonationRef.current = submitDonation;
  });

  useEffect(() => {
    if (!canAutoSubmit || autoSubmittedRef.current) return;
    if (!isSimulator && (!isStripeInitialized || !organization)) return;
    autoSubmittedRef.current = true;
    submitDonationRef.current();
  }, [canAutoSubmit, isSimulator, isStripeInitialized, organization]);

  if (step === "amount") {
    return (
      <View key="amount" style={{ flex: 1 }}>
        <AmountStep
          amount={amount}
          setAmount={setAmount}
          organization={organization}
          bottomInset={bottomInset}
          onContinue={goToDetails}
        />
      </View>
    );
  }

  return (
    <View key="details" style={{ flex: 1 }}>
      <DetailsStep
        amount={renderMoney(Math.round(value * 100))}
        organization={organization}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        message={message}
        setMessage={setMessage}
        isReceivingGoods={isReceivingGoods}
        setIsReceivingGoods={setIsReceivingGoods}
        bottomInset={bottomInset}
        onEditAmount={() => setStep("amount")}
        onSubmit={submitDonation}
        isSubmitting={isSubmittingDonation}
        isConnectingReader={isConnectingReader}
      />
    </View>
  );
}

function AmountStep({
  amount,
  setAmount,
  organization,
  bottomInset,
  onContinue,
}: {
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  organization?: Organization;
  bottomInset: number;
  onContinue: () => void;
}) {
  const [error, setError] = useState(false);
  // The amount card, keypad and Continue button all have to coexist without
  // scrolling, so short screens get a tighter card and smaller keys.
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 740;
  const keySize = compact ? 66 : KEY_DIAMETER;

  const flashError = () => {
    setError(true);
    setTimeout(() => setError(false), 200);
  };

  const pressDigit = (digit: number) => {
    if (
      amountToNumber(amount + digit) > MAX_DONATION_AMOUNT ||
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
        gap: compact ? 12 : 16,
      }}
    >
      <AmountDisplay
        amount={amount}
        error={error}
        organization={organization}
        compact={compact}
      />

      <NumberPad
        keySize={keySize}
        onPressDigit={pressDigit}
        onPressDecimal={pressDecimal}
        onPressBackspace={pressBackspace}
      />

      <Button
        onPress={onContinue}
        style={{ width: "100%", paddingVertical: compact ? 13 : 16 }}
        fontSize={17}
      >
        Continue
      </Button>
    </View>
  );
}

/**
 * The keypad's readout. `amount` is the raw entry state ("$", "$12", "$12.5"),
 * so any cents the donor hasn't typed yet are shown as muted zeros.
 */
function AmountDisplay({
  amount,
  error,
  organization,
  compact,
}: {
  amount: string;
  error?: boolean;
  organization?: Organization;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const isDark = useIsDark();

  const fontSize = compact ? 44 : 56;
  const amountStyle = {
    fontSize,
    fontWeight: "300" as const,
    letterSpacing: -2,
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: error ? palette.primary : cardBorderColor(isDark),
        paddingVertical: compact ? 16 : 20,
        paddingHorizontal: 16,
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 13 }}>
        Donation amount
      </Text>
      <Text
        numberOfLines={1}
        style={{
          ...amountStyle,
          color: error ? palette.primary : colors.text,
        }}
      >
        {amount}
        {amount === "$" && (
          <Text style={{ ...amountStyle, color: palette.muted }}>0</Text>
        )}
        {amount[amount.length - 1] === "." && (
          <Text style={{ ...amountStyle, color: palette.muted }}>00</Text>
        )}
        {amount[amount.length - 2] === "." && (
          <Text style={{ ...amountStyle, color: palette.muted }}>0</Text>
        )}
      </Text>
      {organization ? (
        <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 13 }}>
          for {organization.name}
        </Text>
      ) : null}
    </View>
  );
}

const KEY_DIAMETER = 80;

function NumberPad({
  keySize = KEY_DIAMETER,
  onPressDigit,
  onPressDecimal,
  onPressBackspace,
}: {
  keySize?: number;
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
        width: keySize,
        height: keySize,
        borderRadius: keySize / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: pressed ? palette.primary : cardBorderColor(isDark),
        backgroundColor: pressed
          ? isDark
            ? "rgba(236, 55, 80, 0.18)"
            : "rgba(236, 55, 80, 0.1)"
          : colors.card,
      })}
    >
      {icon ? (
        <Ionicons name={icon} size={keySize * 0.32} color={palette.muted} />
      ) : (
        <Text
          style={{
            color: colors.text,
            fontSize: keySize * 0.37,
            textAlign: "center",
            fontFamily: "JetBrainsMono-Regular",
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );

  // The rows spread across whatever height is left between the amount card and
  // the Continue button, so the pad never leaves a dead band above itself.
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 330,
        alignSelf: "center",
        justifyContent: "space-evenly",
      }}
    >
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

function DetailsStep({
  amount,
  organization,
  name,
  setName,
  email,
  setEmail,
  message,
  setMessage,
  isReceivingGoods,
  setIsReceivingGoods,
  bottomInset,
  onEditAmount,
  onSubmit,
  isSubmitting,
  isConnectingReader,
}: {
  amount: string;
  organization?: Organization;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  isReceivingGoods: boolean;
  setIsReceivingGoods: Dispatch<SetStateAction<boolean>>;
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
          <FormSection title="Donation">
            {organization ? (
              <ReadOnlyField label="To" value={organization.name} />
            ) : null}
            <Pressable onPress={onEditAmount}>
              <ReadOnlyField label="Amount" value={amount} secondary="Edit" />
            </Pressable>
          </FormSection>

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
            <FormField
              label="Message"
              optional
              description="Shown to the organization alongside the donation."
              value={message}
              onChangeText={setMessage}
              placeholder="Two coffees and a bagel"
              autoCapitalize="sentences"
              multiline
            />
            <ToggleField
              label="Receiving goods or services"
              description="Check this if the donor received something of value in exchange for this donation."
              value={isReceivingGoods}
              onValueChange={setIsReceivingGoods}
            />
          </FormSection>

          <Button
            onPress={onSubmit}
            style={{ width: "100%", paddingVertical: 16 }}
            fontSize={17}
            loading={isSubmitting}
          >
            {isConnectingReader ? "Connecting..." : "Create donation"}
          </Button>

          <FooterNote>
            Nothing is charged until the donor pays on the next screen.
          </FooterNote>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
