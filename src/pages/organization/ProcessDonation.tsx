import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { View, Text, StatusBar, Button, ActivityIndicator } from "react-native";
// @ts-expect-error no types
import QRCodeStyled from "react-native-qrcode-styled";

import StyledButton from "../../components/Button";
import { StackParamList } from "../../lib/NavigatorParamList";
import { palette } from "../../theme";

type Props = NativeStackScreenProps<StackParamList, "ProcessDonation">;

export default function ProcessDonationPage({
  navigation,
  route: {
    params: { payment, collectPayment, email, name },
  },
}: Props) {
  const [status, setStatus] = useState<
    "ready" | "loading" | "success" | "error"
  >("ready");
  const [showQR, setShowQR] = useState(false);
  const theme = useTheme();

  const donationUrl = `https://hcb.hackclub.com/donations/start/cider?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&amount=${payment?.amount}`;

  useEffect(() => {
    if (showQR) {
      navigation.setOptions({
        title: "Donation Link",
      });
    }
  }, [showQR, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button
          title={status == "ready" || status == "loading" ? "Cancel" : "Done"}
          color={palette.primary}
          onPress={() => navigation.goBack()}
        />
      ),
    });
  }, [status, navigation]);

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
      <StatusBar barStyle="light-content" />

      {status == "ready" ? (
        <View
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            paddingBottom: 40,
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 24 }}>
            Donation amount
          </Text>
          <Text
            style={{
              fontSize: 50,
              color: theme.colors.text,
            }}
          >
            ${(payment?.amount / 100).toFixed(2)}
          </Text>

          <StyledButton
            onPress={async () => {
              setStatus("loading");
              const success = await collectPayment();
              setStatus(success ? "success" : "error");
            }}
            style={{
              marginBottom: 10,
              position: "absolute",
              bottom: 30,
              width: "100%",
            }}
          >
            Use Tap to Pay
          </StyledButton>
        </View>
      ) : status == "success" ? (
        <View
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            paddingBottom: 100,
          }}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={100}
            color={palette.success}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              marginBottom: 10,
              color: theme.colors.text,
            }}
          >
            Thank you, {name}!
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text,
            }}
          >
            {"$" + (payment?.amount / 100).toFixed(2)} donation completed
            successfully
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text,
              marginTop: 10,
            }}
          >
            A receipt has been sent to the email address:
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text,
            }}
          >
            {email}
          </Text>

          <StyledButton
            onPress={navigation.goBack}
            style={{
              position: "absolute",
              bottom: 30,
              width: "100%",
            }}
          >
            Done
          </StyledButton>
        </View>
      ) : status == "loading" ? (
        <View
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            paddingBottom: 40,
          }}
        >
          <ActivityIndicator
            size="large"
            style={{
              margin: 20,
            }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              paddingBottom: 10,
              color: theme.colors.text,
            }}
          >
            Processing
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text,
            }}
          >
            Please wait...
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "stretch",
            paddingHorizontal: 20,
            paddingBottom: 30,
            backgroundColor: theme.colors.background,
          }}
        >
          <View style={{ width: "100%", flex: 1, justifyContent: "center" }}>
            {!showQR && (
              <>
                <Ionicons
                  name="close-circle-outline"
                  size={100}
                  color={palette.warning}
                  style={{ marginBottom: 16, alignSelf: "center" }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Error
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.colors.text,
                    textAlign: "center",
                    marginBottom: 24,
                  }}
                >
                  An error occurred while processing the donation. Please try
                  again.
                </Text>
              </>
            )}
            {showQR ? (
              <View
                style={{
                  marginBottom: 0,
                  alignItems: "center",
                  backgroundColor: theme.colors.card,
                  padding: 20,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <QRCodeStyled
                  data={donationUrl}
                  style={{ backgroundColor: theme.colors.card }}
                  padding={20}
                  pieceSize={5}
                  pieceCornerType="rounded"
                  isPiecesGlued={true}
                  pieceBorderRadius={1}
                  color={theme.colors.text}
                />
                <Text
                  style={{
                    color: theme.colors.text,
                    marginTop: 15,
                    textAlign: "center",
                    fontSize: 14,
                    opacity: 0.8,
                  }}
                >
                  Scan to complete donation
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ width: "100%", position: "absolute", bottom: 30 }}>
            {!showQR && (
              <StyledButton
                onPress={() => setShowQR(true)}
                style={{ marginBottom: 10 }}
              >
                Show Donation QR Code
              </StyledButton>
            )}
            <StyledButton
              onPress={navigation.goBack}
              style={{
                width: "100%",
              }}
            >
              Close
            </StyledButton>
          </View>
        </View>
      )}
      {/* <Text>{JSON.stringify(payment, null, 2)}</Text> */}
    </View>
  );
}
