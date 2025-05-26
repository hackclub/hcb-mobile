import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme, NavigationProp } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ConnectTapToPayParams,
  PaymentIntent,
  Reader,
  StripeTerminalProvider,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import ExpoTtpEdu from "expo-ttp-edu";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  View,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import * as Progress from "react-native-progress";
import useSWR, { useSWRConfig } from "swr";

import Button from "../../components/Button";
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
  const { fetcher } = useSWRConfig();
  const isDark = useIsDark();
  const { data: organization } = useSWR<Organization>(`organizations/${orgId}`);

  const fetchTokenProvider = async () => {
    const result = await fetcher!("stripe_terminal_connection_token");
    const token = (result as { terminal_connection_token: { secret: string } })
      .terminal_connection_token;
    return token.secret;
  };

  useEffect(() => {
    const getDidOnboarding = async () => {
      const didOnboarding = await AsyncStorage.getItem("ttpDidOnboarding");
      if (didOnboarding !== "true") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        ExpoTtpEdu.showTapToPayEducation({
          uiMode: isDark ? "dark" : "light",
        });
        await AsyncStorage.setItem("ttpDidOnboarding", "true");
      }
    };

    if (Platform.OS === "ios") {
      getDidOnboarding();
    }
  }, [isDark]);

  return (
    <StripeTerminalProvider
      logLevel="verbose"
      tokenProvider={fetchTokenProvider}
    >
      <PageWrapper
        orgId={orgId}
        orgName={organization?.name}
        navigation={navigation}
      />
    </StripeTerminalProvider>
  );
}

function PageWrapper({
  orgId,
  orgName,
  navigation,
}: {
  orgId: `org_${string}`;
  orgName?: string;
  navigation: NavigationProp<StackParamList>;
}) {
  const { initialize, isInitialized } = useStripeTerminal({});
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized)
    return (
      <View
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
        }}
      >
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );

  return (
    <PageContent orgId={orgId} orgName={orgName} navigation={navigation} />
  );
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

function PageContent({
  orgId,
  orgName,
  navigation,
}: {
  orgId: `org_${string}`;
  orgName?: string;
  navigation: NavigationProp<StackParamList>;
}) {
  const { colors } = useTheme();

  // const { data: organization } = useSWR<OrganizationExpanded>(
  //   `organizations/${orgId}?avatar_size=50`,
  //   { fallbackData: cache.get(`organizations/${orgId}`)?.data },
  // );

  // if (!organization) return null;

  const { accessDenied } = useLocation();
  // const { location, accessDenied } = useLocation();

  const [amount, setAmount] = useState("$");

  const { fetcher } = useSWRConfig();

  const value = parseFloat(amount.replace("$", "0"));

  const [reader, setReader] = useState<Reader.Type | undefined>(undefined);
  // const [payment, setPayment] = useState<PaymentIntent | undefined>(undefined);
  // const [loadingCreatePayment, setLoadingCreatePayment] = useState(false);
  // const [loadingCollectPayment, setLoadingCollectPayment] = useState(false);
  // const [loadingConfirmPayment, setLoadingConfirmPayment] = useState(false);
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(null);
  // const [donation, setDonation] = useState<string | undefined>(undefined);

  const locationIdStripeMock = "tml_FWRkngENcVS5Pd";

  const {
    discoverReaders,
    connectReader: connectReaderTapToPay,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: Reader.Type[], ...stuff) => {
      console.log("DISCOVERED READERSS", readers, stuff);
      setReader(readers[0]);
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: string) => {
      setCurrentProgress(progress);
    },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const emailRef = useRef<TextInput>(null);

  const createDonation = async () => {
    const { id } = (await fetcher!(`organizations/${orgId}/donations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_cents: value * 100,
        name,
        email,
      }),
    })) as { id: string };

    // setDonation(id);
    return id;
  };

  console.log("discovery", discoverReaders);

  useEffect(() => {
    discoverReaders({
      discoveryMethod: "tapToPay",
      simulated: false,
    });
  }, [discoverReaders]);

  async function connectReader(selectedReader: Reader.Type) {
    console.log("orgName", orgName);
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
        console.log("connectLocalMobileReader error:", error);
        if (error.message == "You must provide a reader object") {
          discoverReaders({
            discoveryMethod: "tapToPay",
            simulated: false,
          });
        }
        Alert.alert("There wass an error connecting, please try again");
        return false;
      }

      setCurrentProgress(null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingConnectingReader(false);
    }
  }

  async function paymentIntent({ donation_id }: { donation_id: string }) {
    // setLoadingCreatePayment(true);
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
        statementDescriptor: `HCB* ${orgName || "DONATION"}`.substring(0, 22),
      });

      if (error) {
        console.log("Error creating payment intent", error);
        return false;
      }

      // setPayment(paymentIntent);

      navigation.navigate("ProcessDonation", {
        orgId,
        payment: paymentIntent,
        collectPayment: async () => {
          return await collectPayment(paymentIntent);
        },
        name,
        email,
      });

      return paymentIntent;
    } catch (error) {
      console.log(error);
      Alert.alert("Error creating payment intent", error.message);
    } finally {
      // setLoadingCreatePayment(false);
    }
  }

  async function collectPayment(
    localPayment: PaymentIntent.Type,
  ): Promise<boolean> {
    // setLoadingCollectPayment(true);
    console.log(localPayment);
    let output: boolean;
    try {
      const { error } = await collectPaymentMethod({
        paymentIntent: localPayment,
      });

      if (error) {
        console.log("Error collecting payment", error);
        if (error.code != "Canceled") {
          Alert.alert("Error collecting payment", error.message);
        }
        return false;
      }
      output = (await confirmPayment(localPayment)) ?? false;
    } catch (error) {
      console.log(error);
      output = false;
    } finally {
      // setLoadingCollectPayment(false);
    }

    return output;
  }

  async function confirmPayment(localPayment: PaymentIntent.Type) {
    // setLoadingConfirmPayment(true);
    let success;
    try {
      const { error } = await confirmPaymentIntent({
        paymentIntent: localPayment,
      });
      if (error) {
        console.log("Error confirm payment", error);
        return;
      }
      // setPayment(undefined);
      success = true;
    } catch (error) {
      console.log(error);
      success = false;
    } finally {
      // setLoadingConfirmPayment(false);
    }
    return success;
  }

  async function handleRequestLocation() {
    await Linking.openSettings();
  }

  useEffect(() => {
    if (accessDenied) {
      Alert.alert(
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

  if (!connectedReader) {
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
          ) : loadingConnectingReader ? (
            <ActivityIndicator size="large" />
          ) : (
            <View style={{ width: 36, height: 36 }} />
          )}

          <Button
            onPress={async () => {
              if (!connectedReader) {
                if (reader) {
                  return await connectReader(reader);
                }
              }
            }}
            style={{
              marginBottom: 10,
              position: "absolute",
              bottom: 72,

              width: "100%",
            }}
            loading={!reader}
          >
            Collect donations
          </Button>
        </View>
      </View>
    );
  }
  return (
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
            placeholder={"Full name"}
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
            autoFocus
            clearButtonMode="while-editing"
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>
      <Keyboard amount={amount} setAmount={setAmount} />

      {connectedReader ? (
        <Button
          onPress={async () => {
            if (!email.includes("@") || !email.includes(".")) {
              Alert.alert("Please provide a valid email address");
              return;
            }
            const donation_id = await createDonation();
            await paymentIntent({ donation_id });
          }}
          style={{
            width: "100%",
          }}
          disabled={value <= 0 || !name || !email}
        >
          Create donation
        </Button>
      ) : (
        <Button onPress={() => reader && connectReader(reader)}>
          Reconnect reader reader
        </Button>
      )}

      <View
        style={{
          height: 72,
          width: "100%",
        }}
      />
    </View>
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
        fontFamily: "JetBrains Mono",
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
          paddingBottom: 0,
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
