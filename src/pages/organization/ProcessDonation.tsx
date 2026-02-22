import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Icon from "@thedev132/hackclub-icons-rn";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  View,
  StatusBar,
  Button,
  ActivityIndicator,
  Platform,
  Alert,
  ViewStyle,
} from "react-native";
import { Text } from "components/Text";
// @ts-expect-error no types
import QRCodeStyled from "react-native-qrcode-styled";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import StyledButton from "../../components/Button";
import { StackParamList } from "../../lib/NavigatorParamList";
import { useIsDark } from "../../lib/useColorScheme";
import { palette } from "../../styles/theme";
import * as Haptics from "../../utils/haptics";

type Props = NativeStackScreenProps<StackParamList, "ProcessDonation">;

// Component for QR Code display
function QRCodeCard({
  donationUrl,
  amount,
}: {
  donationUrl: string;
  amount?: string;
}) {
  const isDark = useIsDark();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 24,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.12,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: Platform.OS === "android" ? 96 : 64,
      }}
    >
      <QRCodeStyled
        data={donationUrl}
        style={{ backgroundColor: "#fff" }}
        padding={16}
        pieceSize={6}
        pieceCornerType="rounded"
        isPiecesGlued={true}
        pieceBorderRadius={2}
        color="#1f2d3d"
      />
      {amount && (
        <Text
          style={{
            color: "#1f2d3d",
            marginTop: 16,
            textAlign: "center",
            fontSize: 28,
            fontWeight: "600",
          }}
        >
          {amount}
        </Text>
      )}
      <Text
        style={{
          color: palette.muted,
          marginTop: 8,
          textAlign: "center",
          fontSize: 14,
        }}
      >
        Scan to complete donation
      </Text>
    </View>
  );
}

// Component for status icons with background ring
function StatusIcon({ status }: { status: string }) {
  const isDark = useIsDark();
  const color = status === "success" ? palette.success : palette.primary;
  const bgColor =
    status === "success"
      ? isDark
        ? "rgba(51, 214, 166, 0.15)"
        : "rgba(51, 214, 166, 0.1)"
      : isDark
        ? "rgba(236, 55, 80, 0.15)"
        : "rgba(236, 55, 80, 0.1)";

  return (
    <View
      style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: bgColor,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
      }}
    >
      <Ionicons
        name={status === "success" ? "checkmark-circle" : "close-circle"}
        size={72}
        color={color}
      />
    </View>
  );
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
  // On Android, safe area insets at bottom are often 0, so add minimum padding
  const bottomPadding =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;
  return (
    <View
      style={{
        width: "100%",
        position: "absolute",
        bottom: bottomPadding,
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
      fontSize={17}
      style={{
        width: "100%",
        alignSelf: "center",
        marginBottom: 12,
        paddingVertical: 16,
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
  const isDark = useIsDark();

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
        <>
          {Platform.OS === "android" ? (
            <View style={{ marginRight: 20 }}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.text}
                onPress={() => navigation.goBack()}
              />
            </View>
          ) : (
            <Button
              title="Done"
              color={theme.colors.text}
              onPress={() => navigation.goBack()}
            />
          )}
        </>
      ),
    });
  }, [showQR, status, navigation, theme.colors.text]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: isDark
                  ? "rgba(236, 55, 80, 0.12)"
                  : "rgba(236, 55, 80, 0.08)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "600",
                marginBottom: 8,
                color: theme.colors.text,
              }}
            >
              Processing {donationAmount}
            </Text>
            <Text style={{ fontSize: 16, color: palette.muted }}>
              Hold card near device...
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
                fontSize: 32,
                fontWeight: "700",
                marginBottom: 8,
                color: theme.colors.text,
                letterSpacing: -0.5,
              }}
            >
              {donationAmount}
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                marginBottom: 4,
                color: theme.colors.text,
              }}
            >
              {name ? `Thank you, ${name}!` : "Thank you!"}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: palette.muted,
                textAlign: "center",
              }}
            >
              Donation completed successfully
            </Text>
            {email && (
              <View
                style={{
                  marginTop: 20,
                  alignItems: "center",
                  backgroundColor: isDark ? theme.colors.card : "#f1f5f9",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon glyph="email" size={18} color={palette.muted} />
                  <Text
                    style={{
                      fontSize: 14,
                      color: palette.muted,
                    }}
                  >
                    Receipt sent to
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    color: theme.colors.text,
                    fontWeight: "500",
                    marginTop: 4,
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
                      fontSize: 24,
                      fontWeight: "600",
                      color: theme.colors.text,
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    Payment Failed
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: palette.muted,
                      textAlign: "center",
                      marginBottom: 24,
                      paddingHorizontal: 32,
                      lineHeight: 22,
                    }}
                  >
                    The payment couldn't be processed. Please try again or use
                    the QR code instead.
                  </Text>
                </>
              )}
              {showQR && (
                <QRCodeCard donationUrl={donationUrl} amount={donationAmount} />
              )}
            </View>
            <ButtonGroup>
              {showQR ? (
                <>
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
                </>
              ) : (
                <>
                  <ActionButton onPress={handlePayment} variant="primary">
                    Try Again
                  </ActionButton>
                  <ActionButton
                    onPress={() => setShowQR(true)}
                    variant="outline"
                    style={{ marginBottom: 0 }}
                  >
                    Use QR Code Instead
                  </ActionButton>
                </>
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
              <QRCodeCard donationUrl={donationUrl} amount={donationAmount} />
              <ButtonGroup>
                <ActionButton onPress={handleCopyLink} variant="primary">
                  Copy Link
                </ActionButton>
                <ActionButton
                  onPress={() => setShowQR(false)}
                  variant="ghost"
                  style={{ marginBottom: 0 }}
                >
                  Back to Tap to Pay
                </ActionButton>
              </ButtonGroup>
            </View>
          );
        }

        return (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            {/* Tap to Pay Icon */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: isDark
                  ? "rgba(236, 55, 80, 0.12)"
                  : "rgba(236, 55, 80, 0.08)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <Icon glyph="card" size={48} color={palette.primary} />
            </View>
            <Text
              style={{ color: palette.muted, fontSize: 16, marginBottom: 8 }}
            >
              Donation amount
            </Text>
            <Text
              style={{
                fontSize: 56,
                color: theme.colors.text,
                fontWeight: "300",
                letterSpacing: -2,
              }}
            >
              {donationAmount}
            </Text>
            {name && (
              <Text
                style={{
                  fontSize: 15,
                  color: palette.muted,
                  marginTop: 12,
                }}
              >
                from {name}
              </Text>
            )}
            <ButtonGroup>
              <ActionButton onPress={handlePayment} variant="primary">
                Tap to Pay{Platform.OS === "ios" ? " on iPhone" : ""}
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
