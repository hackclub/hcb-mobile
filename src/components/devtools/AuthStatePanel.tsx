import { Ionicons } from "@expo/vector-icons";
import { Text } from "components/Text";
import { useContext } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import useSWR from "swr";

import AuthContext from "../../auth/auth";
import User from "../../lib/types/User";

interface Props {
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
  };
}

function maskToken(token: string): string {
  if (token.length <= 20) return token;
  return token.substring(0, 10) + "..." + token.substring(token.length - 10);
}

export default function AuthStatePanel({ colors }: Props) {
  const { tokenResponse } = useContext(AuthContext);
  const { data: user } = useSWR<User>("user");

  const isExpired = tokenResponse?.expiresIn
    ? Date.now() >
      (tokenResponse.issuedAt || 0) * 1000 +
        (tokenResponse.expiresIn || 0) * 1000
    : false;

  const expiresAt =
    tokenResponse?.expiresIn && tokenResponse?.issuedAt
      ? new Date((tokenResponse.issuedAt + tokenResponse.expiresIn) * 1000)
      : null;

  const timeUntilExpiry = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60))
    : null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, gap: 12 }}
    >
      <Section title="Authentication Status" colors={colors}>
        <Row
          label="Logged In"
          value={tokenResponse?.accessToken ? "Yes" : "No"}
          colors={colors}
          icon={
            tokenResponse?.accessToken ? "checkmark-circle" : "close-circle"
          }
          iconColor={tokenResponse?.accessToken ? "#30d158" : "#ff453a"}
        />
        {tokenResponse && (
          <>
            <Row
              label="Token Status"
              value={isExpired ? "Expired" : "Valid"}
              colors={colors}
              icon={isExpired ? "alert-circle" : "shield-checkmark"}
              iconColor={isExpired ? "#ff453a" : "#30d158"}
            />
            {expiresAt && (
              <Row
                label="Expires At"
                value={expiresAt.toLocaleString()}
                colors={colors}
              />
            )}
            {timeUntilExpiry !== null && !isExpired && (
              <Row
                label="Time Until Expiry"
                value={`${timeUntilExpiry} minutes`}
                colors={colors}
              />
            )}
            <Row
              label="Has Refresh Token"
              value={tokenResponse.refreshToken ? "Yes" : "No"}
              colors={colors}
            />
            <Row
              label="Token Type"
              value={tokenResponse.tokenType || "Bearer"}
              colors={colors}
            />
          </>
        )}
      </Section>

      {tokenResponse?.accessToken && (
        <Section title="Access Token" colors={colors}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "JetBrainsMono-Regular",
              color: colors.text,
            }}
            selectable
          >
            {maskToken(tokenResponse.accessToken)}
          </Text>
        </Section>
      )}

      {user && (
        <Section title="Current User" colors={colors}>
          <Row label="ID" value={user.id} colors={colors} />
          <Row label="Name" value={user.name} colors={colors} />
          <Row label="Email" value={user.email} colors={colors} />
          <Row
            label="Admin"
            value={user.admin ? "Yes" : "No"}
            colors={colors}
            icon={user.admin ? "shield" : "shield-outline"}
            iconColor={user.admin ? "#ff9f0a" : colors.muted}
          />
          <Row
            label="Auditor"
            value={user.auditor ? "Yes" : "No"}
            colors={colors}
            icon={user.auditor ? "eye" : "eye-outline"}
            iconColor={user.auditor ? "#5856d6" : colors.muted}
          />
          {user.birthday && (
            <Row label="Birthday" value={user.birthday} colors={colors} />
          )}
        </Section>
      )}

      {user?.shipping_address && (
        <Section title="Shipping Address" colors={colors}>
          <Row
            label="Line 1"
            value={user.shipping_address.address_line1}
            colors={colors}
          />
          {user.shipping_address.address_line2 && (
            <Row
              label="Line 2"
              value={user.shipping_address.address_line2}
              colors={colors}
            />
          )}
          <Row
            label="City"
            value={user.shipping_address.city}
            colors={colors}
          />
          <Row
            label="State"
            value={user.shipping_address.state}
            colors={colors}
          />
          <Row
            label="Postal Code"
            value={user.shipping_address.postal_code}
            colors={colors}
          />
          <Row
            label="Country"
            value={user.shipping_address.country}
            colors={colors}
          />
        </Section>
      )}
    </ScrollView>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: Props["colors"];
}) {
  return (
    <View
      style={{ borderRadius: 8, padding: 12, backgroundColor: colors.card }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  colors,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  colors: Props["colors"];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}) {
  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 12, marginBottom: 2, color: colors.muted }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={iconColor || colors.text}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={{ fontSize: 14, color: colors.text }} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}
