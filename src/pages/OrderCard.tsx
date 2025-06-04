import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Linking, Alert } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { SafeAreaView } from "react-native-safe-area-context";

import CardIcon from "../components/cards/CardIcon";
import RepIcon from "../components/cards/RepIcon";
import { CardsStackParamList } from "../lib/NavigatorParamList";
import Organization from "../lib/types/Organization";
import { palette } from "../theme";
import { Toast } from "react-native-alert-notification";
import { ALERT_TYPE } from "react-native-alert-notification";
import useClient from "../lib/client";

type Props = NativeStackScreenProps<CardsStackParamList, "OrderCard">;

export default function OrderCardScreen({ navigation, route }: Props) {
  const { colors: themeColors } = useTheme();
  const { user, organizations } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  const [cardType, setCardType] = useState("virtual"); 
  const [organizationId, setOrganizationId] = useState<string>("");
  const [shippingName, setShippingName] = useState(user?.name || "");
  const [addressLine1, setAddressLine1] = useState(user?.shipping_address?.address_line1 || "");
  const [addressLine2, setAddressLine2] = useState(user?.shipping_address?.address_line2 || "");
  const [city, setCity] = useState(user?.shipping_address?.city || "");
  const [stateProvince, setStateProvince] = useState(user?.shipping_address?.state || "");
  const [zipCode, setZipCode] = useState(user?.shipping_address?.postal_code || "");
  const hcb = useClient();

  console.log(user);

  const validateFields = () => {
    if (!organizationId) {
      Alert.alert("Error", "Please select an organization");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (cardType === "plastic") {
      if (!shippingName.trim()) {
        Alert.alert("Error", "Please enter a shipping name");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      if (!addressLine1.trim()) {
        Alert.alert("Error", "Please enter an address");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      if (!city.trim()) {
        Alert.alert("Error", "Please enter a city");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      if (!stateProvince.trim()) {
        Alert.alert("Error", "Please enter a state/province");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      if (!zipCode.trim()) {
        Alert.alert("Error", "Please enter a ZIP code");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    }

    return true;
  };

  const handleCreateCard = async () => {
    if (!validateFields()) return;

    setIsLoading(true);
    console.log(organizationId);
    console.log(cardType);
    console.log(shippingName);
    console.log(city);
    console.log(addressLine1);
    console.log(addressLine2);
    console.log(stateProvince);
    console.log(zipCode);
    try {
        const response = await hcb.post("cards", {

        json: {
          card: {
            organization_id: organizationId,
            card_type: cardType,
            shipping_name: shippingName,
            shipping_address_city: city,
            shipping_address_line1: addressLine1,
            shipping_address_line2: addressLine2,
            shipping_address_postal_code: zipCode,
            shipping_address_state: stateProvince,
            shipping_address_country: "US",
            birthday: user?.birthday
          }
        }
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: "Card created!",
          textBody: "Your card has been created successfully.",
        });
        navigation.goBack()
      } else {
        const data = await response.json();
        Alert.alert("Error", data.error || "Failed to create card");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error("Error creating card:", err);
      Alert.alert("Error", "Failed to create card. Please try again later.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
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
            paddingBottom: cardType === "plastic" ? 50 : 20,
          }}
        >
          <Text
            style={{
              color: themeColors.text,
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 30,
            }}
          >
            Order a card
          </Text>
          
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
            items={(organizations as unknown as Organization[])?.map(org => ({
              label: org.name,
              value: org.id,
            })) || []}
            value={organizationId}
            style={{
              inputIOS: {
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderRadius: 12,
                padding: 12,
                marginBottom: 24,
                fontSize: 15,
              },
              inputAndroid: {
                backgroundColor: themeColors.card,
                color: themeColors.text,
                borderRadius: 12,
                padding: 12,
                marginBottom: 24,
                fontSize: 15,
              },
              placeholder: {
                color: palette.muted,
              },
            }}
            placeholder={{
              label: 'Select an organization...',
              value: null,
            }}
            useNativeAndroidPickerStyle={false}
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
            By submitting, you agree to Stripe's{' '}
            <Text
              style={{ textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL('https://www.stripe.com/cardholder-terms')}
            >
              cardholder terms
            </Text>. Your name,
            birthday, and contact information is shared with them and their
            banking partners.
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
            onPress={handleCreateCard}
            disabled={isLoading}
          >
            <Text style={{ 
              color: themeColors.text, 
              fontWeight: "600",
              fontSize: 16,
            }}>
              {isLoading ? "Creating card..." : "Issue my card"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}