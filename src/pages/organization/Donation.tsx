import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import useSWR from "swr";

const ExpoTtpEdu = Platform.OS === "ios" ? require("expo-ttp-edu") : null;

import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
import useClient from "../../lib/client";
import { logError, logCriticalError } from "../../lib/errorUtils";
import { StackParamList } from "../../lib/NavigatorParamList";
import Organization from "../../lib/types/Organization";
import { useIsDark } from "../../lib/useColorScheme";
import { useLocation } from "../../lib/useLocation";
import { palette } from "../../theme";

// interface PaymentIntent {
//   id: string;
//   amount: number;
//   created: string;
//   currency: string;
//   sdkUuid: string;
//   paymentMethodId: string;
// }

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
        logError("Error in tap-to-pay onboarding", error, {
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
            marginHorizontal: 10,
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
    useSWR<Organization>(`organizations/${orgId}`);
  const { accessDenied } = useLocation();
  const [amount, setAmount] = useState("$");
  const value = parseFloat(amount.replace("$", "0"));
  const [reader, setReader] = useState<Reader.Type | undefined>(undefined);
  const readerRef = useRef<Reader.Type | undefined>(reader);
  useEffect(() => {
    readerRef.current = reader;
  }, [reader]);
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(null);
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
      setReader(readers[0]);
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: string) => {
      setCurrentProgress(progress);
    },
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isTaxDeductable, setIsTaxDeductable] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const [orgCheckLoading, setOrgCheckLoading] = useState(true);
  const hcb = useClient();

  // Load tax deductible setting from AsyncStorage
  useEffect(() => {
    const loadTaxDeductibleSetting = async () => {
      try {
        const saved = await AsyncStorage.getItem("donationTaxDeductible");
        if (saved !== null) {
          setIsTaxDeductable(JSON.parse(saved));
        }
      } catch (error) {
        logError("Error loading tax deductible setting", error);
      }
    };
    loadTaxDeductibleSetting();
  }, []);

  // Save tax deductible setting to AsyncStorage when it changes
  useEffect(() => {
    const saveTaxDeductibleSetting = async () => {
      try {
        await AsyncStorage.setItem(
          "donationTaxDeductible",
          JSON.stringify(isTaxDeductable),
        );
      } catch (error) {
        logError("Error saving tax deductible setting", error);
      }
    };
    saveTaxDeductibleSetting();
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

  // Disconnect the reader as soon as the page loads if the last connected org id is different from the current org id
  useEffect(() => {
    (async () => {
      const storedOrgId = await AsyncStorage.getItem("lastConnectedOrgId");
      if (connectedReader && storedOrgId !== orgId) {
        try {
          setLoadingConnectingReader(false);
          setCurrentProgress(null);
          await disconnectReader();
        } catch (e) {
          logError("Error disconnecting reader on page load", e, {
            context: { orgId, action: "disconnect_reader" },
          });
        }
      }
      setOrgCheckLoading(false);
    })();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect for discoverReaders (must be before early return)
  useEffect(() => {
    (async () => {
      await discoverReaders({
        discoveryMethod: "tapToPay",
      });
    })();
  }, [discoverReaders]);

  // useEffect for accessDenied (must be before early return)
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

  // Block UI until organization is loaded
  if (organizationLoading || !organization) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const orgName = organization.name;
  const orgSlug = organization.slug;

  const createDonation = async () => {
    try {
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
      logCriticalError("Error creating donation", error, {
        orgId,
        amount: value * 100,
      });
      throw error; // Re-throw to let calling code handle it
    }
  };

  async function connectReader(selectedReader: Reader.Type) {
    setLoadingConnectingReader(true);
    try {
      const { error } = await connectReaderTapToPay(
        {
          reader: selectedReader,
          locationId: locationIdStripeMock,
          merchantDisplayName: orgName,
        } as ConnectTapToPayParams,
        "tapToPay",
      );
      setCurrentProgress(null);
      if (error) {
        logCriticalError("connectReader error", error, {
          context: { orgId, action: "connect_reader" },
        });
        if (error.message == "You must provide a reader object") {
          discoverReaders({
            discoveryMethod: "tapToPay",
            simulated: false,
          });
        }
        return false;
      }
      // Update AsyncStorage with the new org id after successful connection
      await AsyncStorage.setItem("lastConnectedOrgId", orgId);
      setCurrentProgress(null);
    } catch (error) {
      logError("connectReader error", error, {
        context: { orgId, action: "connect_reader" },
      });
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
        logCriticalError("createPaymentIntent error", error, {
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
      logError("paymentIntent error", error, {
        context: { orgId, donation_id, action: "payment_intent" },
      });
    }
  }

  async function collectPayment(
    localPayment: PaymentIntent.Type,
  ): Promise<boolean> {
    let output: boolean;
    try {
      const { error } = await collectPaymentMethod({
        paymentIntent: localPayment,
      });
      if (error) {
        if (error.code != "Canceled") {
          showAlert("Error collecting payment", error.message);
        }
        return false;
      }
      output = (await confirmPayment(localPayment)) ?? false;
    } catch (error) {
      logError("collectPayment error", error, {
        context: { orgId, action: "collect_payment" },
      });
      output = false;
    }
    return output;
  }

  async function confirmPayment(localPayment: PaymentIntent.Type) {
    let success;
    try {
      const { error } = await confirmPaymentIntent({
        paymentIntent: localPayment,
      });
      if (error) {
        return;
      }
      success = true;
    } catch (error) {
      logError("confirmPayment error", error, {
        context: { orgId, action: "confirm_payment" },
      });
      success = false;
    }
    return success;
  }

  if (!connectedReader || orgCheckLoading) {
    // centered view that says "connect reader"
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
            Receive donations using Tap to Pay
          </Text>

          {currentProgress ? (
            <View
              style={{
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <Progress.Bar
                progress={parseFloat(currentProgress)}
                width={200}
                height={20}
              />
            </View>
          ) : null}

          <Button
            onPress={async () => {
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
              } else {
                logCriticalError("No reader found " + JSON.stringify(reader), {
                  context: { orgId, action: "connect_reader" },
                });
              }
              // Discover readers once, then wait for a reader to appear
              const readers = await discoverReaders({
                discoveryMethod: "tapToPay",
              });
              const found = await waitForReader();
              if (found && readerRef.current) {
                await connectReader(readerRef.current);
              } else {
                logCriticalError("No reader found " + JSON.stringify(readers), {
                  context: { orgId, action: "connect_reader" },
                });
                showAlert(
                  "No reader found",
                  "No Tap to Pay reader was found nearby. Please make sure your device is ready.",
                );
              }
              setLoadingConnectingReader(false);
            }}
            style={{
              marginBottom: 10,
              position: "absolute",
              bottom: Platform.OS === "android" ? 80 : 110,
              width: "100%",
            }}
            loading={loadingConnectingReader}
          >
            Collect donations
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
          paddingBottom: Platform.OS === "android" ? 80 : 110,
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
                autoFocus
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
                  logCriticalError("createDonation error", error, {
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
              Create donation
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
