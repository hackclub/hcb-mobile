import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Linking } from "react-native";
import Modal from "react-native-modal";

import User from "../../lib/types/User";
import { palette } from "../../theme";

import CardIcon from "./CardIcon";
import RepIcon from "./RepIcon";


interface OrderCardModalProps {
  isVisible: boolean;
  onClose: () => void;
  user: User;
  organizations: string[];
}

export default function OrderCardModal({ isVisible, onClose, user, organizations }: OrderCardModalProps) {
  const [cardType, setCardType] = useState("virtual"); // 'virtual' or 'plastic'
  const { colors: themeColors } = useTheme();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.5}
      style={{ margin: 0, justifyContent: "center" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 5,
            paddingBottom: cardType === "plastic" ? 30 : 0,
          }}
          style={{
            backgroundColor: themeColors.background,
            borderRadius: 20,
            marginHorizontal: 20,
            padding: 20,
            maxHeight: cardType === "plastic" ? "80%" : "60%",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20}}>
            <Text
                style={{
                color: themeColors.text,
                fontSize: 20,
                fontWeight: "bold",
                }}
            >
                Order a card
            </Text>
            <AntDesign name="closecircle" size={24} color={themeColors.text} />
          </View>
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
              marginBottom: 20,
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
                value={user.name}
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
            onPress={onClose}
          >
            <Text style={{ color: themeColors.text, fontWeight: "bold" }}>
              Issue my card
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
