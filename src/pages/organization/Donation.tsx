import * as Progress from 'react-native-progress';
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { capitalize } from "lodash";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import StyledButton from "../../components/Button";

import Stripe from "../../components/Stripe";
import Button from "../../components/Button";
import UserAvatar from "../../components/UserAvatar";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User, { OrgUser } from "../../lib/types/User";
import { palette, theme } from "../../theme";

import { useEffect, useState } from 'react'
import {
  Alert,
  ImageBackground,
  SafeAreaView,
  TextInput,
} from 'react-native'
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native'
import { useLocation } from "../../lib/useLocation";
import { id } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface PaymentIntent {
  id: string
  amount: number
  created: string
  currency: string
  sdkUuid: string
  paymentMethodId: string
}

type Props = NativeStackScreenProps<StackParamList, "OrganizationDonation">;

export default function OrganizationDonationPage({
  route: {
    params: { orgId },
  },
  navigation
}: Props) {
  const { fetcher } = useSWRConfig();

  const fetchTokenProvider = async () => {
    console.log("Fetching stripe token")
    const result = await fetcher!("stripe_terminal_connection_token");

    console.log(result);

    const token = (result as any).terminal_connection_token;
    console.log(token)

    return token.secret;
  };

  return (
    <StripeTerminalProvider
      logLevel="verbose"
      tokenProvider={fetchTokenProvider}
    >
      <PageWrapper orgId={orgId} navigation={navigation} />
    </StripeTerminalProvider>
  );
}

function PageWrapper({ orgId, orgName, navigation }: any) {

  const { initialize, isInitialized, connectLocalMobileReader } = useStripeTerminal({
    
  });
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) return (
    <View style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1
    }}>
      <Text style={{
        marginBottom: 20,
        fontSize: 20,
      }}>Connecting...</Text>
      <ActivityIndicator size="large" />
    </View>
  );

  return <PageContent orgId={orgId} orgName={orgName} navigation={navigation} />;
}

const SectionHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => {
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
        <Text style={{ color: palette.muted, fontSize: 16, marginBottom: 16 }}>{subtitle}</Text>
      )}
    </>
  );
};

function PageContent({ orgId, orgName, navigation }: any) {
  const { colors } = useTheme();

  // const { data: organization } = useSWR<OrganizationExpanded>(
  //   `organizations/${orgId}?avatar_size=50`, 
  //   { fallbackData: cache.get(`organizations/${orgId}`)?.data },
  // );
  const { data: currentUser } = useSWR<User>("user");

  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  // if (!organization) return null;

  const { location, accessDenied } = useLocation()

  const [amount, setAmount] = useState("$");

  const { fetcher } = useSWRConfig();

  const value = parseFloat(amount.replace("$", "0"));

  const [reader, setReader] = useState()
  const [payment, setPayment] = useState<PaymentIntent>()
  const [loadingCreatePayment, setLoadingCreatePayment] = useState(false)
  const [loadingCollectPayment, setLoadingCollectPayment] = useState(false)
  const [loadingConfirmPayment, setLoadingConfirmPayment] = useState(false)
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(null)
  const [donation, setDonation] = useState<string>()

  const locationIdStripeMock = 'tml_FWRkngENcVS5Pd'

  const {
    discoverReaders,
    connectLocalMobileReader,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: any, ...stuff) => {
      console.log("DISCOVERED READERSS", readers, stuff)
      setReader(readers[0])
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: any) => {
      setCurrentProgress(progress);
    }
  })

  const createDonation = async () => {
    const { id } = await fetcher!(`organizations/${orgId}/donations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_cents: value * 100,
      })
    }) as { id: string };

    setDonation(id);
    return id;
  }

  console.log("discovery", discoverReaders)

  useEffect(() => {
    discoverReaders({
      discoveryMethod: 'localMobile',
      simulated: false
    });
  }, [discoverReaders])

  async function connectReader(selectedReader: any) {
    setLoadingConnectingReader(true)
    try {
      const { reader, error } = await connectLocalMobileReader({
        reader: selectedReader,
        locationId: locationIdStripeMock,
      });

      setCurrentProgress(null);

      if (error) {
        console.log('connectLocalMobileReader error:', error)
        if (error.message == "You must provide a reader object") {
          discoverReaders({
            discoveryMethod: "localMobile",
            simulated: false,
          });
        }
        Alert.alert('There wass an error connecting, please try again')
        return
      }

      setCurrentProgress(null);

      console.log('Reader connected successfully', reader)
    } catch (error) {
      console.log(error)
    } finally {
      setLoadingConnectingReader(false)
    }
  }

  async function paymentIntent({ donation_id }: { donation_id: any }) {
    setLoadingCreatePayment(true)
    try {
      const { error, paymentIntent } = await createPaymentIntent({
        amount: Number((value * 100).toFixed()),
        currency: 'usd',
        paymentMethodTypes: ['card_present'],
        offlineBehavior: 'prefer_online',
        captureMethod: "automatic",
        metadata: {
          donation_id,
          donation: "true"
        },
        statementDescriptor: `HCB* ${orgName || "DONATION"}`.substring(0, 22),
      })

      if (error) {
        console.log('Error creating payment intent', error)
        return
      }

      setPayment(paymentIntent)

      navigation.navigate("ProcessDonation", {
        orgId,
        payment: paymentIntent,
        collectPayment: () => collectPayment(paymentIntent)
      });

      return paymentIntent
    } catch (error) {
      console.log(error)
      Alert.alert('Error creating payment intent', error.message)
    } finally {
      setLoadingCreatePayment(false)
    }
  }

  async function collectPayment(localPayment: any) {
    setLoadingCollectPayment(true)
    console.log(localPayment)
    let output;
    try {
      const { error, paymentIntent } = await collectPaymentMethod({
        paymentIntent: localPayment,
      } as any)

      if (error) {
        console.log('Error collecting payment', error)
        Alert.alert('Error collecting payment', error.message)
        return
      }
      output = await confirmPayment(localPayment)
    } catch (error) {
      console.log(error)
      output = false
    } finally {
      setLoadingCollectPayment(false)
    }

    return output
  }

  async function confirmPayment(localPayment: any) {
    setLoadingConfirmPayment(true)
    let success
    try {
      const { error, paymentIntent } = await confirmPaymentIntent({
        paymentIntent: localPayment as any
      })
      if (error) {
        console.log('Error confirm payment', error)
        return
      }
      console.log('Payment confirmed', paymentIntent)
      setPayment(undefined)
      success = true
    } catch (error) {
      console.log(error)
      success = false
    } finally {
      setLoadingConfirmPayment(false)
    }
    return success
  }

  async function handleRequestLocation() {
    await Linking.openSettings()
  }

  useEffect(() => {
    if (accessDenied) {
      Alert.alert(
        'Access to location',
        'To use the app, you need to allow the use of your device location.',
        [
          {
            text: 'Activate',
            onPress: handleRequestLocation,
          },
        ]
      )
    }
  }, [accessDenied])

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



      <View style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,

          paddingBottom: 100
      }}>
                <Ionicons name="card-outline" size={100} color={palette.primary} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "600",
                    marginBottom: 10,
                    marginTop: 10,
                    color: colors.text
                }}>Collect Donations</Text>
                <Text style={{
                    fontSize: 16,
                    color: colors.text,
                    marginBottom: 20
                }}>Receive donations using Tap to Pay</Text>

        {currentProgress ? <View style={{
          marginTop: 8,
          marginBottom: 8
        }}>
          <Progress.Bar progress={currentProgress} width={200} height={20} />
        </View> : loadingConnectingReader ? <ActivityIndicator size="large" /> : <View style={{ width: 36, height: 36 }} />}


          <StyledButton onPress={async () => {
                      if (!connectedReader) {
                        return await connectReader(reader)
                      }
            
          }} style={{
              marginBottom: 10,
              position: 'absolute',
              bottom: 72,


              width: '100%'
          }} loading={!reader}>
              Collect donations
          </StyledButton>
      </View>
  </View>
    )
    return (
      <View style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
      }}>
        <Text style={{
          marginBottom: 20,
          fontSize: 20,
          color: theme.colors.text
        }}>Collect donations</Text>
        <Button onPress={async () => {
          if (!connectedReader) {
            return await connectReader(reader)
          }
        }} style={{
          marginBottom: 10
        }}>
          Get started!
        </Button>
        {loadingConnectingReader && !currentProgress && <ActivityIndicator size="large" />}
        {currentProgress && <Progress.Bar progress={currentProgress} width={200} />}
      </View>
    )
  }

  return (
    <View
      style={{
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    >
      <SectionHeader title="Capture Donation" subtitle="Collect donations for your organization right from your mobile device." />

      <Keyboard amount={amount} setAmount={setAmount} />

      {connectedReader ? (
        <Button
          onPress={async () => {
            const donation_id = await createDonation();
            await paymentIntent({ donation_id });
          }}
          style={{
            width: "100%",
          }}
        >
          Create donation
        </Button>
      ) : (
        <Button onPress={() => connectReader(reader)}>
          Reconnect reader reader
        </Button>
      )}

      <View style={{
        height: 72,
        width: "100%"
      }} />

    </View>
  );
}

function Keyboard({ amount, setAmount} : any) {
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
    
    const Number = ({
      number,
      symbol,
      onPress,
    }: {
      number?: number;
      symbol?: String;
      onPress?: () => void;
    }) => (
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 24,
          textAlign: "center",
          fontFamily: "JetBrains Mono",
          flexGrow: 1,
        }}
        onPress={(e) => {
          if (onPress) {
            onPress();
          } else if (typeof number != undefined) {
            pressNumber(amount, number as number);
          }
        }}
      >
        {number}
        {symbol}
      </Text>
    );
    
    return (
      <View style={{
        width: "100%",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-around"
      }}>
        <Text
          style={{
            color: error ? palette.primary : theme.colors.text,
            paddingTop: 12,
            paddingBottom: 0,
            paddingHorizontal: 10,
            fontSize: 72,
            textTransform: "uppercase",
            textAlign: 'center'
          }}
        >
          {amount}
          {amount == "$" && <Text>0</Text>}
          {amount[amount.length - 1] == "." && <Text style={{color: palette.muted}}>00</Text>}
          {amount[amount.length - 2] == "." && <Text style={{color: palette.muted}}>0</Text>}
        </Text>
        <View>
          <View style={{flexDirection: 'row', paddingTop: 24, paddingBottom: 24}}>
            <Number number={1} />
            <Number number={2} />
            <Number number={3} />
          </View>
          <View style={{flexDirection: 'row', paddingTop: 24, paddingBottom: 24}}>
            <Number number={4} />
            <Number number={5} />
            <Number number={6} />
          </View>
          <View style={{flexDirection: 'row', paddingTop: 24, paddingBottom: 24}}>
            <Number number={7} />
            <Number number={8} />
            <Number number={9} />
          </View>
          <View style={{flexDirection: 'row', paddingTop: 24, paddingBottom: 16}}>
            <Number symbol={"."} onPress={() => pressDecimal(amount)} />
            <Number number={0} />
            <Number symbol={"←"} onPress={() => pressBackspace(amount)} />
          </View>
        </View>
      </View>
  )
}
