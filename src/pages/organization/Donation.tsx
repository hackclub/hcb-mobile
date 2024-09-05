import * as Progress from 'react-native-progress';
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { capitalize } from "lodash";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';

import Stripe from "../../components/Stripe";
import Button from "../../components/Button";
import UserAvatar from "../../components/UserAvatar";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User, { OrgUser } from "../../lib/types/User";
import { palette } from "../../theme";

import { useEffect, useState } from 'react'
import {
  Alert,
  ImageBackground,
  SafeAreaView,
  TextInput,
} from 'react-native'
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native'
import { useLocation } from "../../lib/useLocation";

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

    const result = await fetcher!("user");

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

function PageWrapper({ orgId, navigation }: any) {

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

  return <PageContent orgId={orgId} navigation={navigation} />;
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

function PageContent({ orgId, navigation }: any) {
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

  const [amount, setAmount] = useState("");

  const value = parseFloat(amount);

  const [reader, setReader] = useState()
  const [payment, setPayment] = useState<PaymentIntent>()
  const [loadingCreatePayment, setLoadingCreatePayment] = useState(false)
  const [loadingCollectPayment, setLoadingCollectPayment] = useState(false)
  const [loadingConfirmPayment, setLoadingConfirmPayment] = useState(false)
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(null)

  const locationIdStripeMock = 'tml_FrcFgksbiIZZ2V'

  const {
    discoverReaders,
    connectLocalMobileReader,
    createPaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: any) => {
      setReader(readers[0])
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: any) => {
      setCurrentProgress(progress);
    }
  })

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
        Alert.alert('Error connecting, please try again')
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

  async function paymentIntent() {
    setLoadingCreatePayment(true)
    try {
      const { error, paymentIntent } = await createPaymentIntent({
        amount: Number((value * 100).toFixed()),
        currency: 'usd',
        paymentMethodTypes: ['card_present'],
        offlineBehavior: 'prefer_online',
        captureMethod: "automatic"
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
      <View style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
      }}>
        <Text style={{
          marginBottom: 20,
          fontSize: 20,
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
        justifyContent: "flex-start",
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    >
      <SectionHeader title="Capture Donation" subtitle="Collect donations for your organization right from your mobile device." />
      <Text
        style={{
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        Donation amount
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 15,
          width: "100%",
          marginBottom: 16,
          marginTop: 10
        }}
        placeholder="Enter the value"
        value={amount}
        onChangeText={(inputValue) => {
          const stripped = inputValue.split("").filter(char => "1234567890.".includes(char)).join("");
          const formatted = stripped.split(".").length > 2 ? stripped.slice(0, -1) : stripped;
          const capped = formatted.indexOf(".") >= 0 ? formatted.substring(0, formatted.indexOf(".") + 3) : formatted;

          setAmount(capped);
        }}
        keyboardType="numeric"
      />

      {connectedReader ? (
        <Button
          onPress={async () => {
            await paymentIntent();
          }}
        >
          Create donation
        </Button>
      ) : (
        <Button onPress={() => connectReader(reader)}>
          Reconnect reader reader
        </Button>
      )}

    </View>
  );
}
