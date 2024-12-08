import { useEffect, useState } from 'react'
import {
  Alert,
  ImageBackground,
  Linking,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native'



import Button from "../components/Button";
import { useLocation } from '../lib/useLocation';

export default function Stripe() {
  const { initialize, connectLocalMobileReader } = useStripeTerminal();
  useEffect(() => {
    initialize();
  }, [initialize]);
  return (
    <PageStripe />
  );
}


interface PaymentIntent {
  id: string
  amount: number
  created: string
  currency: string
  sdkUuid: string
  paymentMethodId: string
}

export function PageStripe() {
  const { location, accessDenied } = useLocation()

  const [value, setValue] = useState(0)
  const [reader, setReader] = useState()
  const [payment, setPayment] = useState<PaymentIntent>()
  const [loadingCreatePayment, setLoadingCreatePayment] = useState(false)
  const [loadingCollectPayment, setLoadingCollectPayment] = useState(false)
  const [loadingConfirmPayment, setLoadingConfirmPayment] = useState(false)
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false)

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
  })

  useEffect(() => {
    discoverReaders({
      discoveryMethod: 'localMobile',
      simulated: false,
    })
  }, [discoverReaders])

  async function connectReader(selectedReader: any) {
    setLoadingConnectingReader(true)
    try {
      const { reader, error } = await connectLocalMobileReader({
        reader: selectedReader,
        locationId: locationIdStripeMock,
      })

      if (error) {
        console.log('connectLocalMobileReader error:', error)
        return
      }

      Alert.alert('Reader connected successfully')

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
      })

      if (error) {
        console.log('Error creating payment intent', error)
        return
      }

      setPayment(paymentIntent)

      Alert.alert('Payment intent created successfully')
    } catch (error) {
      console.log(error)
    } finally {
      setLoadingCreatePayment(false)
    }
  }

  async function collectPayment() {
    setLoadingCollectPayment(true)
    try {
      const { error, paymentIntent } = await collectPaymentMethod({
        paymentIntent: payment,
      } as any)

      if (error) {
        console.log('Error collecting payment', error)
        Alert.alert('Error collecting payment', error.message)
        return
      }

      Alert.alert('Payment successfully collected', '', [
        {
          text: 'Ok',
          onPress: async () => {
            console.log(paymentIntent);
            await confirmPayment()
          },
        },
      ])
    } catch (error) {
      console.log(error)
    } finally {
      setLoadingCollectPayment(false)
    }
  }

  async function confirmPayment() {
    setLoadingConfirmPayment(true)
    console.log("foo", { payment })
    try {
      const { error, paymentIntent } = await confirmPaymentIntent({
        paymentIntent: payment as any
      })

      if (error) {
        console.log('Error confirm payment', error)
        return
      }

      Alert.alert('Payment successfully confirmed!', 'Congratulations')
      console.log('Payment confirmed', paymentIntent)
    } catch (error) {
      console.log(error)
    } finally {
      setLoadingConfirmPayment(false)
    }
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flex: 1,
        }}
      >
        <View style={{ paddingTop: 10, gap: 10 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Stripe
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ marginBottom: 20, gap: 10 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#635AFF',
              }}
            >
              Amount to be charged
            </Text>
            <TextInput
              style={{
                borderColor: '#635AFF',
                borderWidth: 1,
                borderRadius: 8,
                padding: 15,
              }}
              placeholder="Enter the value"
              onChangeText={(inputValue) => setValue(Number(inputValue))}
              keyboardType="numeric"
            />
          </View>

          <Button
            onPress={() => connectReader(reader)}
            loading={loadingConnectingReader}
          >Connecting with the reader{'disabled' + !!connectedReader}</Button>

          <Button
            onPress={paymentIntent}
            loading={loadingCreatePayment}
          >Create payment intent{'disabled' + !connectedReader}</Button>

          <Button
            onPress={collectPayment}
            loading={loadingCollectPayment}
          >Collect payment{'disabled' + !connectedReader}</Button>

          <Button
            onPress={confirmPayment as any}
            loading={loadingConfirmPayment}
          >Confirm payment</Button>
        </View>
        <View></View>
      </View>
    </SafeAreaView>
  )
}