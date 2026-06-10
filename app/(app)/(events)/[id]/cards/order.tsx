import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";

import Button from "@/components/Button";
import CardIcon from "@/components/cards/CardIcon";
import RepIcon from "@/components/cards/RepIcon";
import { Text } from "@/components/Text";
import useClient from "@/lib/client";
import CardDesign from "@/lib/types/CardDesign";
import Organization, { OrganizationExpanded } from "@/lib/types/Organization";
import User from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import useOfflineSWR from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";
import { handleCreateCard } from "@/utils/cardActions";

export default function Page() {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const [isLoading, setIsLoading] = useState(false);
  const { data: user } = useOfflineSWR<User>(`user?expand=shipping_address`);
  const [cardType, setCardType] = useState("virtual");
  const [cardDesign, setCardDesign] = useState<CardDesign | null>(null);
  const params = useLocalSearchParams();
  const [organizationId, setOrganizationId] = useState<string>(
    String(params?.id || ""),
  );
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
  const [, setExpandedOrganizations] = useState<
    Record<string, OrganizationExpanded>
  >({});
  const { data: cardDesigns } = useOfflineSWR<CardDesign[]>(
    organizationId
      ? `cards/card_designs?event_id=${organizationId}`
      : `cards/card_designs`,
  );
  const hcb = useClient();
  const { data: organizations } = useSWR<Organization[]>("user/organizations");
  const { fetcher } = useSWRConfig();
  const currentUserId = user?.id;

  const { showActionSheetWithOptions } = useActionSheet();
  const orgPreselected = Boolean(params?.id);
  const selectableOrganizations =
    organizations?.filter((org) => org.playground_mode === false) ?? [];
  const selectedOrganization = selectableOrganizations.find(
    (org) => org.id === organizationId,
  );

  useEffect(() => {
    if (params?.id) {
      setOrganizationId(String(params.id));
      setCardDesign(null);
    }
  }, [params?.id]);

  useEffect(() => {
    if (orgPreselected || organizationId || !organizations) return;
    const firstOrg = organizations.find((org) => org.playground_mode === false);
    if (firstOrg) setOrganizationId(firstOrg.id);
  }, [orgPreselected, organizationId, organizations]);

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
      cardDesign?.id || "",
      hcb,
      user,
      setIsLoading,
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
        }}
      >
        <Stack.Screen
          options={{ headerLargeTitle: true, title: "Order a Card" }}
        />
        {!orgPreselected && (
          <>
            <Text
              style={{
                color: themeColors.text,
                fontSize: 16,
                fontWeight: "500",
                marginBottom: 12,
              }}
            >
              Which organization?
            </Text>
            <Pressable
              onPress={() => {
                const options = [
                  ...selectableOrganizations.map((org) => org.name),
                  "Cancel",
                ];
                showActionSheetWithOptions(
                  {
                    title: "Which organization?",
                    options,
                    cancelButtonIndex: options.length - 1,
                    userInterfaceStyle: isDark ? "dark" : "light",
                  },
                  (index) => {
                    if (
                      index === undefined ||
                      index >= selectableOrganizations.length
                    ) {
                      return;
                    }
                    setOrganizationId(selectableOrganizations[index].id);
                    setCardDesign(null);
                  },
                );
              }}
              style={{
                backgroundColor: themeColors.card,
                borderRadius: 8,
                padding: 12,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: selectedOrganization
                    ? themeColors.text
                    : palette.muted,
                  fontSize: 15,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {selectedOrganization?.name ?? "Select an organization"}
              </Text>
              <Ionicons name="chevron-expand" size={16} color={palette.muted} />
            </Pressable>
          </>
        )}
        <Text
          style={{
            color: themeColors.text,
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
              backgroundColor: isDark ? "#2A424E" : "#E7F2F9",
              borderRadius: 8,
              padding: 20,
              width: "48%",
              alignItems: "center",
              justifyContent: "flex-end",
              borderWidth: 2,
              borderColor:
                cardType === "virtual"
                  ? isDark
                    ? themeColors.text
                    : "#338eda"
                  : "transparent",
            }}
            onPress={() => setCardType("virtual")}
          >
            <RepIcon
              color={isDark ? (themeColors.text as string) : "#338eda"}
            />
            <Text
              style={{
                color: isDark ? themeColors.text : "#338eda",
                fontWeight: "600",
                marginTop: 4,
                marginBottom: 2,
                fontSize: 16,
              }}
            >
              Virtual
            </Text>
            <Text
              style={{
                color: isDark ? palette.smoke : "#338eda",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Online-only, instant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: isDark ? "#2A424E" : "#E7F2F9",
              borderRadius: 8,
              padding: 20,
              width: "48%",
              alignItems: "center",
              justifyContent: "flex-end",
              borderWidth: 2,
              borderColor:
                cardType === "plastic"
                  ? isDark
                    ? themeColors.text
                    : "#338eda"
                  : "transparent",
            }}
            onPress={() => setCardType("plastic")}
          >
            <CardIcon
              color={isDark ? (themeColors.text as string) : "#338eda"}
            />
            <Text
              style={{
                color: isDark ? themeColors.text : "#338eda",
                fontWeight: "600",
                marginTop: 8,
                marginBottom: 4,
                fontSize: 16,
              }}
            >
              Plastic
            </Text>
            <Text
              style={{
                color: isDark ? palette.smoke : "#338eda",
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
                color: isDark ? palette.smoke : themeColors.text,
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
                borderRadius: 8,
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
                borderRadius: 8,
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
                borderRadius: 8,
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
                  borderRadius: 8,
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
                  borderRadius: 8,
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
                  borderRadius: 8,
                  padding: 12,
                  width: "48%",
                  fontSize: 15,
                }}
              />
              <TextInput
                value={"United States"}
                editable={false}
                style={{
                  backgroundColor: themeColors.card,
                  color: themeColors.text,
                  borderRadius: 8,
                  padding: 12,
                  width: "48%",
                  fontSize: 15,
                }}
              />
            </View>
            <Text
              style={{
                color: isDark ? palette.smoke : themeColors.text,
                fontSize: 16,
                fontWeight: "500",
                marginBottom: 16,
              }}
            >
              Card Designs
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                marginBottom: 24,
                gap: 12,
              }}
            >
              {cardDesigns?.map((design) => {
                const isSelected = cardDesign?.id === design.id;
                return (
                  <TouchableOpacity
                    key={design.id}
                    style={{
                      backgroundColor: design.unlisted
                        ? isDark
                          ? "#322D21"
                          : "#F7F4E3"
                        : isDark
                          ? "#2A424E"
                          : "#E7F2F9",
                      borderRadius: 8,
                      width: "48%",
                      marginBottom: isSelected ? -4 : 0,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? themeColors.text : "",
                      overflow: "hidden",
                    }}
                    onPress={() => setCardDesign(design)}
                  >
                    <View
                      style={{
                        borderWidth: design.unlisted ? 1 : 0,
                        borderColor: "#ff8c37",
                        borderRadius: 8,
                        borderStyle: "dashed",
                        margin: isSelected ? -2 : 0,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.text,
                          fontSize: 15,
                          fontWeight: "600",
                          marginBottom: 12,
                          textAlign: "center",
                          marginTop: 16,
                          marginHorizontal: 14,
                        }}
                      >
                        {design.name}
                      </Text>
                      <View style={{ alignSelf: "flex-start", width: "100%" }}>
                        <View
                          style={{
                            backgroundColor: design.color,
                            borderTopRightRadius: 12,
                            borderBottomLeftRadius: isSelected ? 0 : 12,
                            aspectRatio: 1.586,
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            marginRight: 16,
                            paddingRight: 16,
                            paddingTop: 16,
                          }}
                        >
                          <Image
                            source={{ uri: design.logo_url }}
                            style={{
                              width: "50%",
                              height: "50%",
                            }}
                            tintColor={
                              design.color === "black" ? "white" : "black"
                            }
                            contentFit="contain"
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
            style={{
              textDecorationLine: "underline",
              color: palette.muted,
              fontSize: 13,
              marginBottom: 24,
              lineHeight: 18,
            }}
            onPress={() =>
              Linking.openURL(
                "https://stripe.com/legal/issuing/celtic-authorized-user-terms",
              )
            }
          >
            cardholder terms
          </Text>
          . Your name, birthday, and contact information is shared with them and
          their banking partners.
        </Text>

        <Button
          variant="blue"
          loading={isLoading}
          disabled={!organizationId}
          onPress={handleOrderCard}
          style={{ marginBottom: 20 }}
        >
          Issue my card
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
