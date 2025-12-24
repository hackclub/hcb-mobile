import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ConnectTapToPayParams,
  Reader,
  useStripeTerminal,
} from "@stripe/stripe-terminal-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  ActivityIndicator,
  Linking,
  Text,
  View,
} from "react-native";
import * as Progress from "react-native-progress";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ExpoTtpEdu = Platform.OS === "ios" ? require("expo-ttp-edu") : null;

import Button from "../../components/Button";
import { showAlert } from "../../lib/alertUtils";
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
  const { colors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

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

  const [reader, setReader] = useState<Reader.Type | undefined>(
    preDiscoveredReaders.length > 0 ? preDiscoveredReaders[0] : undefined,
  );
  const readerRef = useRef<Reader.Type | undefined>(reader);
  const [loadingConnectingReader, setLoadingConnectingReader] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<string | null>(
    softwareUpdateProgress,
  );

  const locationIdStripeMock = "tml_FWRkngENcVS5Pd";
  const {
    discoverReaders,
    connectReader: connectReaderTapToPay,
    disconnectReader,
    connectedReader,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers: Reader.Type[]) => {
      if (!reader && readers.length > 0) setReader(readers[0]);
    },
    onDidReportReaderSoftwareUpdateProgress: (progress: string) => {
      if (!isUpdatingReaderSoftware) setCurrentProgress(progress);
    },
  });

  // Tap to Pay onboarding
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

  useEffect(() => {
    readerRef.current = reader;
  }, [reader]);

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

  // Disconnect reader if org changed
  useEffect(() => {
    (async () => {
      const storedOrgId = await AsyncStorage.getItem("lastConnectedOrgId");
      if (connectedReader && storedOrgId !== orgId) {
        try {
          await disconnectReader();
        } catch (e) {
          console.error("Error disconnecting reader on page load", e, {
            context: { orgId, action: "disconnect_reader" },
          });
        }
      }
    })();
  }, [connectedReader, disconnectReader, orgId]);

  // Discover readers
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
  }, [discoverReaders, orgId, isStripeInitialized, preDiscoveredReaders.length]);

  // Location access
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

  // Connect reader function
  async function connectReader(selectedReader: Reader.Type) {
    if (!isStripeInitialized) {
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

      await AsyncStorage.setItem("lastConnectedOrgId", orgId);
      setCurrentProgress(null);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code == "AlreadyConnectedToReader") {
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

  // Navigate to NewDonation screen
  const navigateToNewDonation = () => {
    navigation.navigate("NewDonation", {
      orgId,
      orgSlug: organization?.slug || "",
    });
  };

  // Handle Get Started button
  const handleGetStarted = async () => {
    // Dev mode - skip reader connection
    if (__DEV__) {
      navigateToNewDonation();
      return;
    }

    setLoadingConnectingReader(true);

    const waitForReader = async (timeoutMs = 10000, pollInterval = 300) => {
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

    // Try to connect with existing reader
    if (reader) {
      const connected = await connectReader(reader);
      if (connected) {
        navigateToNewDonation();
      }
      setLoadingConnectingReader(false);
      return;
    }

    if (preDiscoveredReaders.length > 0) {
      const connected = await connectReader(preDiscoveredReaders[0]);
      if (connected) {
        navigateToNewDonation();
      }
      setLoadingConnectingReader(false);
      return;
    }

    if (!isStripeInitialized) {
      showAlert(
        "Payment System Error",
        "Payment system is not ready. Please try again.",
      );
      setLoadingConnectingReader(false);
      return;
    }

    // Discover and connect
    const readers = await discoverReaders({
      discoveryMethod: "tapToPay",
    });
    const found = await waitForReader();
    if (found && readerRef.current) {
      const connected = await connectReader(readerRef.current);
      if (connected) {
        navigateToNewDonation();
      }
    } else {
      console.error("No reader found", JSON.stringify(readers));
      showAlert(
        "No reader found",
        "No Tap to Pay reader was found. Please make sure your device supports Tap to Pay and try again.",
      );
    }
    setLoadingConnectingReader(false);
  };

  // Loading state
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

  // Error state
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

  // Main splash screen
  return (
    <View
      style={{
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        paddingBottom: Math.max(tabBarHeight, insets.bottom) + 24,
      }}
    >
      <View
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          width: "100%",
        }}
      >
        {/* Hero Icon Container */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: isDark
              ? "rgba(236, 55, 80, 0.12)"
              : "rgba(236, 55, 80, 0.08)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark
                ? "rgba(236, 55, 80, 0.2)"
                : "rgba(236, 55, 80, 0.15)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="card-outline" size={40} color={palette.primary} />
          </View>
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            marginBottom: 12,
            color: colors.text,
            letterSpacing: -0.5,
            textAlign: "center",
          }}
        >
          Collect Donations
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: palette.muted,
            textAlign: "center",
            lineHeight: 24,
            paddingHorizontal: 20,
          }}
        >
          Accept contactless payments using Tap to Pay
          {Platform.OS === "ios" ? " on iPhone" : ""}
        </Text>

        {/* Feature Pills */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            marginTop: 32,
            paddingHorizontal: 16,
          }}
        >
          {[
            { icon: "flash-outline", text: "Instant" },
            { icon: "shield-checkmark-outline", text: "Secure" },
            { icon: "receipt-outline", text: "Tax receipts" },
          ].map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? colors.card : "#f1f5f9",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                gap: 6,
              }}
            >
              <Ionicons
                name={feature.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={palette.muted}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress indicators */}
        {isUpdatingReaderSoftware && (
          <View
            style={{
              marginTop: 32,
              alignItems: "center",
              width: "100%",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: palette.muted,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Updating reader software...
            </Text>
            {currentProgress && (
              <View style={{ width: "100%", maxWidth: 240 }}>
                <Progress.Bar
                  progress={parseFloat(currentProgress)}
                  color={palette.primary}
                  width={null}
                  height={6}
                  borderRadius={3}
                  unfilledColor={isDark ? colors.card : "#e2e8f0"}
                  borderWidth={0}
                />
              </View>
            )}
          </View>
        )}

        {currentProgress && !isUpdatingReaderSoftware ? (
          <View
            style={{
              marginTop: 32,
              width: "100%",
              paddingHorizontal: 40,
            }}
          >
            <Progress.Bar
              progress={parseFloat(currentProgress || "0")}
              color={palette.primary}
              width={null}
              height={6}
              borderRadius={3}
              unfilledColor={isDark ? colors.card : "#e2e8f0"}
              borderWidth={0}
            />
          </View>
        ) : null}
      </View>

      <Button
        onPress={handleGetStarted}
        style={{
          marginBottom: 0,
          width: "100%",
          paddingVertical: 16,
        }}
        fontSize={17}
        loading={loadingConnectingReader}
      >
        Get Started
      </Button>
    </View>
  );
}
