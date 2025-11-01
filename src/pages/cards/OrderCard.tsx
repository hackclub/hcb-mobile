import { useTheme } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR, { useSWRConfig } from "swr";

import CardIcon from "../../components/cards/CardIcon";
import RepIcon from "../../components/cards/RepIcon";
import useClient from "../../lib/client";
import { CardsStackParamList } from "../../lib/NavigatorParamList";
import Organization, {
  OrganizationExpanded,
} from "../../lib/types/Organization";
import User from "../../lib/types/User";
import { useIsDark } from "../../lib/useColorScheme";
import useOfflineSWR from "../../lib/useOfflineSWR";
import { palette } from "../../styles/theme";
import { handleCreateCard } from "../../utils/cardActions";

type Props = NativeStackScreenProps<CardsStackParamList, "OrderCard">;

export default function OrderCardScreen({ navigation }: Props) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const [isLoading, setIsLoading] = useState(false);
  const { data: user } = useOfflineSWR<User>(`user?expand=shipping_address`);
  const [cardType, setCardType] = useState("virtual");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [shippingName, setShippingName] = useState(user?.name || "");
  const [addressLine1, setAddressLine1] = useState(
    user?.shipping_address?.address_line1 || "",
  );
  const [addressLine2, setAddressLine2] = useState(
    user?.shipping_address?.address_line2 || "",
  );
  const [city, setCity] = useState(user?.shipping_address?.city || "");
  const [stateProvince, setStateProvince] = useState(
    user?.shipping_address?.state || "",
  );
  const [zipCode, setZipCode] = useState(
    user?.shipping_address?.postal_code || "",
  );
  const [expandedOrganizations, setExpandedOrganizations] = useState<
    Record<string, OrganizationExpanded>
  >({});
  const hcb = useClient();
  const { data: organizations } = useSWR<Organization[]>("user/organizations");
  const { fetcher } = useSWRConfig();
  const currentUserId = user?.id;

  useEffect(() => {
    if (!organizations || !fetcher || !currentUserId) return;

    const fetchOrganizations = async () => {
      const expanded: Record<string, OrganizationExpanded> = {};

      try {
        const fetchPromises = organizations
          .filter((org) => org.playground_mode === false)
          .map(async (org) => {
            try {
              const expandedOrg = (await fetcher(
                `organizations/${org.id}`,
              )) as OrganizationExpanded;
              if (expandedOrg && "users" in expandedOrg) {
                expanded[org.id] = expandedOrg;
              }
            } catch (error) {
              console.error(`Error fetching organization ${org.id}:`, error);
            }
          });

        await Promise.all(fetchPromises);
        setExpandedOrganizations(expanded);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };

    fetchOrganizations();
  }, [organizations, fetcher, currentUserId]);

  // Filter organizations where user is NOT a reader
  const eligibleOrganizations = useMemo(() => {
    if (!organizations || !currentUserId) return [];

    return organizations
      .filter((org) => org.playground_mode === false)
      .filter((org) => {
        const expandedOrg = expandedOrganizations[org.id];
        if (!expandedOrg || !("users" in expandedOrg)) {
          return true;
        }

        const userInOrg = expandedOrg.users.find((u) => u.id === currentUserId);
        if (!userInOrg) {
          return false;
        }

        return userInOrg.role !== "reader";
      });
  }, [organizations, expandedOrganizations, currentUserId]);

  const handleOrderCard = async () => {
    if (!user) return;
    await handleCreateCard(
      organizationId,
      cardType,
      shippingName,
      city,
      addressLine1,
      addressLine2,
      zipCode,
      stateProvince,
      hcb,
      user,
      setIsLoading,
      navigation as unknown as NativeStackNavigationProp<CardsStackParamList>,
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, marginTop: 30 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          scrollToOverflowEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            marginTop: 30,
            paddingBottom: cardType === "plastic" ? 50 : 20,
          }}
        >
          <Text
            style={{
              color: palette.smoke,
              fontSize: 16,
              fontWeight: "500",
              marginBottom: 12,
            }}
          >
            Which organization?
          </Text>

          <RNPickerSelect
            onValueChange={(value) => setOrganizationId(value)}
            items={[
              ...eligibleOrganizations.map((org) => ({
                label: org.name,
                value: org.id,
              })),
            ]}
            value={organizationId}
            darkTheme={isDark}
            style={{
              inputIOS: {
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderRadius: 12,
                padding: 12,
                marginBottom: 24,
                fontSize: 15,
                pointerEvents: "none",
              },
              inputAndroid: {
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderRadius: 12,
                padding: 12,
                marginBottom: 24,
                fontSize: 15,
              },
            }}
            placeholder={{
              label: "Select an organization...",
              value: null,
            }}
          />

          <Text
            style={{
              color: palette.smoke,
              fontSize: 16,
              fontWeight: "500",
              marginBottom: 12,
            }}
          >
            What type of card?
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#2A424E",
                borderRadius: 12,
                padding: 20,
                width: "48%",
                alignItems: "center",
                justifyContent: "flex-end",
                borderWidth: cardType === "virtual" ? 2 : 0,
                borderColor: cardType === "virtual" ? themeColors.text : "",
              }}
              onPress={() => setCardType("virtual")}
            >
              <RepIcon />
              <Text
                style={{
                  color: themeColors.text,
                  fontWeight: "600",
                  marginTop: 12,
                  marginBottom: 6,
                  fontSize: 16,
                }}
              >
                Virtual
              </Text>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Online-only, instant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#2A424E",
                borderRadius: 12,
                padding: 20,
                width: "48%",
                alignItems: "center",
                justifyContent: "flex-end",
                borderWidth: cardType === "plastic" ? 2 : 0,
                borderColor: cardType === "plastic" ? themeColors.text : "",
              }}
              onPress={() => setCardType("plastic")}
            >
              <CardIcon />
              <Text
                style={{
                  color: themeColors.text,
                  fontWeight: "600",
                  marginTop: 12,
                  marginBottom: 6,
                  fontSize: 16,
                }}
              >
                Plastic
              </Text>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Mailed, 10-12 biz. days
              </Text>
            </TouchableOpacity>
          </View>

          {cardType === "plastic" && (
            <>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 16,
                  fontWeight: "500",
                  marginBottom: 12,
                }}
              >
                Shipping info
              </Text>
              <TextInput
                placeholder="Shipping name"
                placeholderTextColor={palette.muted}
                value={shippingName}
                onChangeText={setShippingName}
                style={{
                  backgroundColor: themeColors.card,
                  color: themeColors.text,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              />
              <TextInput
                placeholder="Address (line 1)"
                placeholderTextColor={palette.muted}
                value={addressLine1}
                onChangeText={setAddressLine1}
                style={{
                  backgroundColor: themeColors.card,
                  color: themeColors.text,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              />
              <TextInput
                placeholder="Address (line 2)"
                placeholderTextColor={palette.muted}
                value={addressLine2}
                onChangeText={setAddressLine2}
                style={{
                  backgroundColor: themeColors.card,
                  color: themeColors.text,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <TextInput
                  placeholder="City"
                  placeholderTextColor={palette.muted}
                  value={city}
                  onChangeText={setCity}
                  style={{
                    backgroundColor: themeColors.card,
                    color: themeColors.text,
                    borderRadius: 12,
                    padding: 12,
                    width: "48%",
                    fontSize: 15,
                  }}
                />
                <TextInput
                  placeholder="State / province"
                  placeholderTextColor={palette.muted}
                  value={stateProvince}
                  onChangeText={setStateProvince}
                  style={{
                    backgroundColor: themeColors.card,
                    color: themeColors.text,
                    borderRadius: 12,
                    padding: 12,
                    width: "48%",
                    fontSize: 15,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <TextInput
                  placeholder="ZIP code"
                  placeholderTextColor={palette.muted}
                  value={zipCode}
                  onChangeText={setZipCode}
                  style={{
                    backgroundColor: themeColors.card,
                    color: themeColors.text,
                    borderRadius: 12,
                    padding: 12,
                    width: "48%",
                    fontSize: 15,
                  }}
                />
                <TextInput
                  value={"United States"}
                  style={{
                    backgroundColor: themeColors.card,
                    color: themeColors.text,
                    borderRadius: 12,
                    padding: 12,
                    width: "48%",
                    fontSize: 15,
                  }}
                />
              </View>
            </>
          )}

          <Text
            style={{
              color: palette.muted,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            Plastic cards can only be shipped within the US.
          </Text>

          <Text
            style={{
              color: palette.muted,
              fontSize: 13,
              marginBottom: 24,
              lineHeight: 18,
            }}
          >
            By submitting, you agree to Stripe's{" "}
            <Text
              style={{ textDecorationLine: "underline" }}
              onPress={() =>
                Linking.openURL("https://www.stripe.com/cardholder-terms")
              }
            >
              cardholder terms
            </Text>
            . Your name, birthday, and contact information is shared with them
            and their banking partners.
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#007bff",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginBottom: 20,
              opacity: isLoading ? 0.7 : 1,
            }}
            onPress={handleOrderCard}
            disabled={isLoading}
          >
            <Text
              style={{
                color: themeColors.text,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {isLoading ? "Creating card..." : "Issue my card"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
