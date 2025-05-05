import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Linking } from "react-native";

import { CardsStackParamList } from "../lib/NavigatorParamList";
import { palette } from "../theme";

import CardIcon from "../components/cards/CardIcon";
import RepIcon from "../components/cards/RepIcon";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<CardsStackParamList, "OrderCard">;

export default function OrderCardScreen({ navigation, route }: Props) {
  const { colors: themeColors } = useTheme();
  const { user, organizations } = route.params;

  // Form state variables
  const [cardType, setCardType] = useState("virtual"); // 'virtual' or 'plastic'
  const [organization, setOrganization] = useState(organizations?.[0] || "");
  const [shippingName, setShippingName] = useState(user?.name || "");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");

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
              fontSize: 22,
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            Order a card
          </Text>
          
          <Text
            style={{
              color: palette.smoke,
              fontSize: 16,
              marginBottom: 10,
            }}
          >
            Which organization?
          </Text>

          <View
            style={{
              backgroundColor: themeColors.card,
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: themeColors.text }}>TampaHacks</Text>
          </View>

          <Text
            style={{
              color: palette.smoke,
              fontSize: 16,
              marginBottom: 10,
            }}
          >
            What type of card?
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#2A424E",
                borderRadius: 10,
                padding: 15,
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
                  fontWeight: "bold",
                  marginBottom: 5,
                }}
              >
                Virtual
              </Text>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 12,
                }}
              >
                Online-only, instant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#2A424E",
                borderRadius: 10,
                padding: 15,
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
                  fontWeight: "bold",
                  marginBottom: 5,
                }}
              >
                Plastic
              </Text>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 12,
                }}
              >
                Mailed, 10-12 biz. days
              </Text>
            </TouchableOpacity>

          </View>
          <Text
              style={{
                  color: palette.smoke,
                  fontSize: 12,
                  marginTop: 10,
                  marginBottom: 20,
                  }}
              >
                  Physical cards can only be shipped within the US.
              </Text>
          {cardType === "plastic" && (
            <>
              <Text
                style={{
                  color: palette.smoke,
                  fontSize: 16,
                  marginBottom: 10,
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
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
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
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
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
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
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
                    borderRadius: 10,
                    padding: 10,
                    width: "48%",
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
                    borderRadius: 10,
                    padding: 10,
                    width: "48%",
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
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
                    borderRadius: 10,
                    padding: 10,
                    width: "48%",
                  }}
                />
                <TextInput
                  placeholder="Country"
                  placeholderTextColor={palette.muted}
                  value={country}
                  onChangeText={setCountry}
                  style={{
                    backgroundColor: themeColors.card,
                    color: themeColors.text,
                    borderRadius: 10,
                    padding: 10,
                    width: "48%",
                  }}
                />
              </View>
            </>
          )}

          <Text
            style={{
              color: palette.muted,
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            Plastic cards can only be shipped within the US.
          </Text>

          <Text
            style={{
              color: palette.muted,
              fontSize: 12,
              marginBottom: 20,
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
              padding: 15,
              borderRadius: 10,
              alignItems: "center",
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: themeColors.text, fontWeight: "bold" }}>
              Issue my card
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}