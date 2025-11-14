import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, NavigationProp } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ConnectTapToPayParams,
  PaymentIntent,
  Reader,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import Checkbox from "expo-checkbox";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import {
  Platform,
  ActivityIndicator,
  Linking,
  Text,
  View,
  TextInput,
  Keyboard as RNKeyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  TouchableOpacity,
} from "react-native";
import * as Progress from "react-native-progress";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ExpoTtpEdu = Platform.OS === "ios" ? require("expo-ttp-edu") : null;

import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { StackParamList } from "../../lib/NavigatorParamList";
import Organization from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import { useLocation } from "../../lib/useLocation";
import { useOfflineSWR } from "../../lib/useOfflineSWR";
import { useStripeTerminalInit } from "../../lib/useStripeTerminalInit";
import { palette } from "../../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "OrganizationDonation">;

export default function OrganizationDonationPage({
  route: {
    params: { orgId },
  },
  navigation,
}: Props) {
  const isDark = useIsDark();

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

  return <PageWrapper orgId={orgId} navigation={navigation} />;
}

function PageWrapper({
  orgId,
  navigation,
}: {
  orgId: `org_${string}`;
  navigation: NavigationProp<StackParamList>;
}) {
  return <PageContent orgId={orgId} navigation={navigation} />;
}

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const { colors } = useTheme();

  return (
    <>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: subtitle ? 10 : 16,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: palette.muted, fontSize: 16, marginBottom: 16 }}>
          {subtitle}
        </Text>
      )}
    </>
  );
};

const SettingsModal = ({
  visible,
  onClose,
  isTaxDeductable,
  setIsTaxDeductable,
}: {
  visible: boolean;
  onClose: () => void;
  isTaxDeductable: boolean;
  setIsTaxDeductable: (value: boolean) => void;
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>
            Donation Settings
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: palette.primary }}>Done</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: 1,
            padding: 20,
            marginHorizontal: 30,
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 16 }}>
                I'm receiving goods for this donation.
              </Text>
              <Text
                style={{ color: palette.muted, fontSize: 14, marginTop: 8 }}
              >
                Check this if the donor is receiving goods or services in
                exchange for their donation.
              </Text>
            </View>

            <Checkbox
              color={colors.primary}
              style={{
                borderRadius: 5,
                width: 25,
                height: 25,
                marginHorizontal: 10,
              }}
              value={isTaxDeductable}
              onValueChange={setIsTaxDeductable}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

function PageContent({
  orgId,
  navigation,
}: {
  orgId: `org_${string}`;
  navigation: NavigationProp<StackParamList>;
}) {
  const { colors } = useTheme();
  const { data: organization, isLoading: organizationLoading } =
    useOfflineSWR<Organization>(`organizations/${orgId}`);
  const { accessDenied } = useLocation();
  const {
    isInitialized: isStripeInitialized,
    isInitializing: isStripeInitializing,
    error: stripeInitError,
    discoveredReaders: preDiscoveredReaders,
    isUpdatingReaderSoftware,
    updateProgress: softwareUpdateProgress,
  } = useStripeTerminalInit({
    organizationId: orgId,
    enabled: true,
    enableReaderPreConnection: true,
    enableSoftwareUpdates: false,
  });
  const [amount, setAmount] = useState("$");
  const value = parseFloat(amount.replace("$", "0"));
  const [reader, setReader] = useState<Reader.Type | undefined>(
    preDiscoveredReaders.length > 0 ? preDiscoveredReaders[0] : undefined,
  );
  const readerRef = useRef<Reader.Type | undefined>(reader);
  useEffect(() => {
    readerRef.current = reader;
  }, [reader]);
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(
    softwareUpdateProgress,
  );

  useEffect(() => {
    if (preDiscoveredReaders.length > 0 && !reader) {
      setReader(preDiscoveredReaders[0]);
    }
  }, [preDiscoveredReaders, reader]);

  useEffect(() => {
    setCurrentProgress(
      isUpdatingReaderSoftware ? softwareUpdateProgress : null,
    );
  }, [softwareUpdateProgress, isUpdatingReaderSoftware]);
  const locationIdStripeMock = "tml_FWRkngENcVS5Pd";
  const {
    discoverReaders,
    connectReader: connectReaderTapToPay,
    disconnectReader,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: Reader.Type[]) => {
      if (!reader && readers.length > 0) setReader(readers[0]);
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: string) => {
      if (!isUpdatingReaderSoftware) setCurrentProgress(progress);
    },
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isTaxDeductable, setIsTaxDeductable] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const [orgCheckLoading, setOrgCheckLoading] = useState(true);
  const hcb = useClient();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const saved = await AsyncStorage.getItem("donationTaxDeductible");
        if (saved !== null) setIsTaxDeductable(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading tax deductible setting", error);
      }
    };
    loadSetting();
  }, []);

  useEffect(() => {
    const saveSetting = async () => {
      try {
        await AsyncStorage.setItem(
          "donationTaxDeductible",
          JSON.stringify(isTaxDeductable),
        );
      } catch (error) {
        console.error("Error saving tax deductible setting", error);
      }
    };
    saveSetting();
  }, [isTaxDeductable]);

  // Set up navigation header with settings icon when connected
  useLayoutEffect(() => {
    if (connectedReader && !orgCheckLoading) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowSettingsModal(true)}
            style={{ padding: 4 }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: undefined,
      });
    }
  }, [navigation, connectedReader, orgCheckLoading, colors.text]);

  useEffect(() => {
    (async () => {
      const storedOrgId = await AsyncStorage.getItem("lastConnectedOrgId");
      if (connectedReader && storedOrgId !== orgId) {
        try {
          setLoadingConnectingReader(false);
          setCurrentProgress(null);
          await disconnectReader();
        } catch (e) {
          console.error("Error disconnecting reader on page load", e, {
            context: { orgId, action: "disconnect_reader" },
          });
        }
      }
      setOrgCheckLoading(false);
    })();
  }, [connectedReader, disconnectReader, orgId]);

  useEffect(() => {
    (async () => {
      try {
        if (
          discoverReaders &&
          isStripeInitialized &&
          preDiscoveredReaders.length === 0
        ) {
          await discoverReaders({ discoveryMethod: "tapToPay" });
        }
      } catch (error) {
        console.error("Error discovering readers", error, {
          context: { orgId, action: "discover_readers" },
        });
      }
    })();
  }, [
    discoverReaders,
    orgId,
    isStripeInitialized,
    preDiscoveredReaders.length,
  ]);

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

  if (organizationLoading || !organization || isStripeInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
        {isStripeInitializing && (
          <Text style={{ color: colors.text, marginTop: 10 }}>
            Initializing payment system...
          </Text>
        )}
      </View>
    );
  }

  if (stripeInitError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Ionicons name="warning-outline" size={64} color={palette.primary} />
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Payment System Error
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontSize: 16,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Unable to initialize the payment system. Please try again later.
        </Text>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Go Back
        </Button>
      </View>
    );
  }

  const orgName = organization.name;
  const orgSlug = organization.slug;

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
      throw error; // Re-throw to let calling code handle it
    }
  };

  async function connectReader(selectedReader: Reader.Type) {
    if (!isStripeInitialized) {
      console.error(
        "Attempted to connect reader before Stripe Terminal initialization",
        new Error("Stripe Terminal not initialized"),
        {
          context: { orgId, action: "connect_reader" },
        },
      );
      showAlert(
        "Payment System Error",
        "Payment system is not ready. Please try again.",
      );
      return false;
    }

    setLoadingConnectingReader(true);
    try {
      const { error } = await connectReaderTapToPay(
        {
          reader: selectedReader,
          locationId: locationIdStripeMock,
          merchantDisplayName: organization?.name || "HCB",
        } as ConnectTapToPayParams,
        "tapToPay",
      );

      setCurrentProgress(null);
      if (error) {
        console.error("connectReader error", error, {
          context: { orgId, action: "connect_reader" },
        });
        showAlert(
          "Connection Error",
          "Failed to connect to Tap to Pay reader. Please try again.",
        );
        return false;
      }

      console.log("Successfully connected to Tap to Pay reader");
      // Update AsyncStorage with the new org id after successful connection
      await AsyncStorage.setItem("lastConnectedOrgId", orgId);
      setCurrentProgress(null);
      return true;
    } catch (error) {
      if (error.code == "AlreadyConnectedToReader") {
        return true;
      }
      console.error("connectReader error", error, {
        context: { orgId, action: "connect_reader" },
      });
      showAlert(
        "Connection Error",
        "Failed to connect to Tap to Pay reader. Please try again.",
      );
      return false;
    } finally {
      setLoadingConnectingReader(false);
    }
  }

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
        },
        statementDescriptor:
          `HCB ${orgName.replace(/[<>\\'"*]/g, "") || "DONATION"}`.substring(
            0,
            22,
          ),
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

  if (!connectedReader || orgCheckLoading) {
    return (
      <View
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <View
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,

            paddingBottom: 100,
          }}
        >
          <Ionicons name="card-outline" size={100} color={palette.primary} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              marginBottom: 10,
              marginTop: 10,
              color: colors.text,
            }}
          >
            Collect Donations
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.text,
              marginBottom: 20,
            }}
          >
            Receive donations using Tap to Pay{" "}
            {Platform.OS === "ios" ? "on iPhone" : ""}
          </Text>

          {isUpdatingReaderSoftware && (
            <View
              style={{
                marginTop: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Updating reader software...
              </Text>
              {currentProgress && (
                <Progress.Bar
                  progress={parseFloat(currentProgress)}
                  color={palette.primary}
                  width={200}
                  height={20}
                />
              )}
            </View>
          )}

          {currentProgress && !isUpdatingReaderSoftware ? (
            <View
              style={{
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <Progress.Bar
                progress={parseFloat(currentProgress || "0")}
                color={palette.primary}
                width={200}
                height={20}
              />
            </View>
          ) : null}

          <Button
            onPress={async () => {
              if (__DEV__) {
                navigation.navigate("ProcessDonation", {
                  orgId,
                  payment: { amount: 5000 } as PaymentIntent.Type, // $50.00
                  collectPayment: async () => {
                    // Mock payment function - simulates success after 2 seconds
                    return new Promise((resolve) =>
                      setTimeout(() => resolve(true), 2000),
                    );
                  },
                  name: "Dev Test User",
                  email: "dev@example.com",
                  slug: orgSlug || "test-org",
                });
                return;
              }
              setLoadingConnectingReader(true);
              const waitForReader = async (
                timeoutMs = 10000,
                pollInterval = 300,
              ) => {
                const maxAttempts = Math.ceil(timeoutMs / pollInterval);
                let attempts = 0;
                while (attempts < maxAttempts) {
                  await new Promise((res) => setTimeout(res, pollInterval));
                  if (readerRef.current) {
                    return true;
                  }
                  attempts++;
                }
                return false;
              };

              if (reader) {
                await connectReader(reader);
                setLoadingConnectingReader(false);
                return;
              }

              if (preDiscoveredReaders.length > 0) {
                await connectReader(preDiscoveredReaders[0]);
                setLoadingConnectingReader(false);
                return;
              }

              if (!isStripeInitialized) {
                console.error(
                  "Attempted to discover readers before Stripe Terminal initialization",
                  new Error("Stripe Terminal not initialized"),
                  {
                    context: { orgId, action: "discover_readers" },
                  },
                );
                showAlert(
                  "Payment System Error",
                  "Payment system is not ready. Please try again.",
                );
                setLoadingConnectingReader(false);
                return;
              }

              const readers = await discoverReaders({
                discoveryMethod: "tapToPay",
              });
              const found = await waitForReader();
              if (found && readerRef.current) {
                await connectReader(readerRef.current);
              } else {
                console.error("No reader found", JSON.stringify(readers));
                showAlert(
                  "No reader found",
                  "No Tap to Pay reader was found. Please make sure your device supports Tap to Pay and try again.",
                );
              }
              setLoadingConnectingReader(false);
            }}
            style={{
              marginBottom: 10,
              position: "absolute",
              bottom: insets.bottom + 30,
              width: "100%",
            }}
            loading={loadingConnectingReader}
          >
            Collect Donations
          </Button>
        </View>
      </View>
    );
  }
  return (
    <TouchableWithoutFeedback onPress={() => RNKeyboard.dismiss()}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight,
        }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            padding: 20,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flex: 1,
            width: "100%",
            height: "100%",
          }}
        >
          <SectionHeader
            title="Capture Donation"
            subtitle="Collect donations for your organization right from your mobile device."
          />

          <View
            style={{
              flexDirection: "column",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 20,
              }}
            >
              <View style={{ flexBasis: 70 }}>
                <Text style={{ color: colors.text, fontSize: 20 }}>Name</Text>
              </View>
              <TextInput
                style={{
                  color: colors.text,
                  backgroundColor: colors.card,
                  padding: 12,
                  borderRadius: 8,
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
                placeholder={"Full name (optional)"}
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
                justifyContent: "flex-start",
                gap: 20,
                marginTop: 10,
              }}
            >
              <View style={{ flexBasis: 70 }}>
                <Text style={{ color: colors.text, fontSize: 20 }}>Email</Text>
              </View>
              <TextInput
                style={{
                  color: colors.text,
                  backgroundColor: colors.card,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  flex: 1,
                }}
                selectTextOnFocus
                clearButtonMode="while-editing"
                placeholder="Email (optional)"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                ref={emailRef}
              />
            </View>
          </View>
          <View style={{ flex: 1, width: "100%", marginVertical: 15 }}>
            <Keyboard amount={amount} setAmount={setAmount} />
          </View>

          {connectedReader ? (
            <Button
              onPress={async () => {
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
                marginTop: "auto",
              }}
            >
              Create Donation
            </Button>
          ) : (
            <Button
              onPress={() => reader && connectReader(reader)}
              style={{
                marginTop: "auto",
              }}
            >
              Reconnect reader
            </Button>
          )}
        </View>
        <SettingsModal
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          isTaxDeductable={isTaxDeductable}
          setIsTaxDeductable={setIsTaxDeductable}
        />
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
        fontSize: 24,
        textAlign: "center",
        fontFamily: "JetBrainsMono-Regular",
        flexGrow: 1,
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
          style={{ flexDirection: "row", paddingTop: 24, paddingBottom: 16 }}
        >
          <Number number={4} />
          <Number number={5} />
          <Number number={6} />
        </View>
        <View
          style={{ flexDirection: "row", paddingTop: 24, paddingBottom: 16 }}
        >
          <Number number={7} />
          <Number number={8} />
          <Number number={9} />
        </View>
        <View
          style={{ flexDirection: "row", paddingTop: 24, paddingBottom: 16 }}
        >
          <Number symbol={"."} onPress={() => pressDecimal(amount)} />
          <Number number={0} />
          <Number symbol={"←"} onPress={() => pressBackspace(amount)} />
        </View>
      </View>
    </View>
  );
};
