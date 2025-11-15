import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StatusBar,
  Button,
  ActivityIndicator,
  Platform,
  Alert,
  ViewStyle,
} from "react-native";
// @ts-expect-error no types
import QRCodeStyled from "react-native-qrcode-styled";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import StyledButton from "../../components/Button";
import { StackParamList } from "../../lib/NavigatorParamList";
import { palette } from "../../styles/theme";

type Props = NativeStackScreenProps<StackParamList, "ProcessDonation">;

// Component for QR Code display
function QRCodeCard({
  donationUrl,
  theme,
}: {
  donationUrl: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.card,
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
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
  );
}

// Component for status icons
function StatusIcon({ status }: { status: string }) {
  const iconProps = {
    size: 100,
    style: { marginBottom: 16, alignSelf: "center" as const },
  };

  switch (status) {
    case "success":
      return (
        <Ionicons
          name="checkmark-circle-outline"
          color={palette.success}
          {...iconProps}
        />
      );
    case "error":
      return (
        <Ionicons
          name="close-circle-outline"
          color={palette.primary}
          {...iconProps}
        />
      );
    default:
      return null;
  }
}

// Component for button groups
function ButtonGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        width: "100%",
        position: "absolute",
        bottom: insets.bottom,
        alignItems: "center",
        ...style,
      }}
    >
      {children}
    </View>
  );
}

// Simple wrapper to maintain consistent spacing for ProcessDonation buttons
function ActionButton({
  onPress,
  children,
  style,
  variant = "primary",
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}) {
  return (
    <StyledButton
      onPress={onPress}
      variant={variant}
      style={{
        width: "100%",
        alignSelf: "center",
        marginBottom: 10,
        ...style,
      }}
    >
      {children}
    </StyledButton>
  );
}

export default function ProcessDonationPage({
  navigation,
  route: {
    params: { payment, collectPayment, email, name, slug },
  },
}: Props) {
  const [status, setStatus] = useState<
    "ready" | "loading" | "success" | "error"
  >("ready");
  const [showQR, setShowQR] = useState(false);
  const theme = useTheme();

  const donationUrl = `https://hcb.hackclub.com/donations/start/${slug}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&amount=${payment?.amount}`;
  const donationAmount = `$${(payment?.amount / 100).toFixed(2)}`;

  const handlePayment = async () => {
    setStatus("loading");
    const success = await collectPayment();
    setStatus(success ? "success" : "error");
    Haptics.notificationAsync(
      success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(donationUrl);
    Alert.alert("Copied!", "Donation link copied to clipboard.");
  };

  useEffect(() => {
    navigation.setOptions({
      title: showQR ? "Donation Link" : undefined,
      headerLeft: () => (
        <View style={{ marginRight: Platform.OS === "android" ? 15 : 0 }}>
          <Button
            title={
              status === "ready" || status === "loading" ? "Cancel" : "Done"
            }
            color={palette.primary}
            onPress={() => navigation.goBack()}
          />
        </View>
      ),
    });
  }, [showQR, status, navigation]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" style={{ margin: 20 }} />
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
            <Text style={{ fontSize: 16, color: theme.colors.text }}>
              Please wait...
            </Text>
          </View>
        );

      case "success":
        return (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingBottom: 100,
            }}
          >
            <StatusIcon status="success" />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 10,
                color: theme.colors.text,
              }}
            >
              {name ? `Thank you, ${name}!` : "Thank you!"}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.text,
                textAlign: "center",
              }}
            >
              {donationAmount} donation completed successfully
            </Text>
            {email && (
              <View style={{ marginTop: 16, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.colors.text,
                    textAlign: "center",
                  }}
                >
                  A receipt has been sent to:
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.colors.text,
                    fontWeight: "500",
                  }}
                >
                  {email}
                </Text>
              </View>
            )}
            <ButtonGroup>
              <ActionButton
                onPress={navigation.goBack}
                style={{ marginBottom: 0 }}
              >
                Done
              </ActionButton>
            </ButtonGroup>
          </View>
        );

      case "error":
        return (
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {!showQR && (
                <>
                  <StatusIcon status="error" />
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
                      paddingHorizontal: 20,
                    }}
                  >
                    An error occurred while processing the donation. Please try
                    again.
                  </Text>
                </>
              )}
              {showQR && <QRCodeCard donationUrl={donationUrl} theme={theme} />}
            </View>
            <ButtonGroup>
              <ActionButton onPress={handlePayment} variant="primary">
                Retry Payment
              </ActionButton>
              {!showQR && (
                <ActionButton
                  onPress={() => setShowQR(true)}
                  variant="secondary"
                >
                  Show QR Code
                </ActionButton>
              )}
            </ButtonGroup>
          </View>
        );

      case "ready":
      default:
        if (showQR) {
          return (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <QRCodeCard donationUrl={donationUrl} theme={theme} />
              <ButtonGroup>
                <ActionButton onPress={handleCopyLink} variant="primary">
                  Copy Link
                </ActionButton>
                <ActionButton
                  onPress={() => setShowQR(false)}
                  variant="ghost"
                  style={{ marginBottom: 0 }}
                >
                  Back
                </ActionButton>
              </ButtonGroup>
            </View>
          );
        }

        return (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text
              style={{ color: palette.muted, fontSize: 24, marginBottom: 8 }}
            >
              Donation amount
            </Text>
            <Text
              style={{
                fontSize: 50,
                color: theme.colors.text,
                fontWeight: "300",
              }}
            >
              {donationAmount}
            </Text>
            <ButtonGroup>
              <ActionButton onPress={handlePayment} variant="primary">
                Use Tap to Pay {Platform.OS === "ios" ? "on iPhone" : ""}
              </ActionButton>
              <ActionButton
                onPress={() => setShowQR(true)}
                variant="outline"
                style={{ marginBottom: 0 }}
              >
                Show QR Code
              </ActionButton>
            </ButtonGroup>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
      <StatusBar barStyle="light-content" />
      {renderContent()}
    </SafeAreaView>
  );
}
