import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { ActivityIndicator, View } from "react-native";
import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import UserAvatar from "@/components/UserAvatar";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import Invitation from "@/lib/types/Invitation";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette, radii, subTextColor } from "@/styles/theme";
import { renderDate } from "@/utils/format";
import { orgColor } from "@/utils/org";

const CATEGORY_LABELS: Record<string, string> = {
  hackathon: "Hackathon",
  hack_club: "Hack Club",
  nonprofit: "Nonprofit",
  event: "Event",
  high_school_hackathon: "High School Hackathon",
  robotics_team: "Robotics Team",
  hardware_grant: "Hardware Grant",
  hack_club_hq: "Hack Club HQ",
  outernet_guild: "Outernet Guild",
  grant_recipient: "Grant Recipient",
  salary: "Salary",
};

function DetailRow({
  icon,
  children,
  isDark,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={16} color={subTextColor(isDark)} />
      <Text
        style={{ color: subTextColor(isDark), fontSize: 14, flexShrink: 1 }}
      >
        {children}
      </Text>
    </View>
  );
}

export default function Page() {
  const hcb = useClient();
  const { id: inviteId, invitation: _invitation } = useLocalSearchParams();

  let fallbackInvitation: Invitation | undefined;
  try {
    fallbackInvitation = _invitation
      ? JSON.parse(_invitation as string)
      : undefined;
  } catch {
    fallbackInvitation = undefined;
  }

  const {
    data: invitation,
    error: invitationError,
    mutate: retryInvitation,
  } = useOfflineSWR<Invitation>(`user/invitations/${inviteId}`, {
    fallbackData: fallbackInvitation,
  });

  const { mutate } = useSWRConfig();

  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  const { trigger: accept, isMutating: acceptIsLoading } = useSWRMutation<
    unknown,
    unknown,
    string,
    never,
    Invitation[]
  >(
    `user/invitations`,
    () => hcb.post(`user/invitations/${inviteId}/accept`).json(),
    {
      populateCache: (_, invitations) =>
        invitations?.filter((i) => i.id != inviteId) || [],
      onSuccess: () => {
        mutate(`user/organizations`);
        mutate("user/invitations");
        if (invitation) {
          router.replace({
            pathname: "/(events)/[id]",
            params: { id: invitation.organization.id },
          });
        } else {
          router.back();
        }
      },
      onError: async (err) => {
        showAlert(
          "Failed to Accept Invitation",
          await parseApiError(
            err,
            "You may have to sign the contract. Please contact HCB support if you believe this is an error.",
          ),
          [{ text: "OK" }],
        );
      },
    },
  );

  const { trigger: reject, isMutating: rejectIsLoading } = useSWRMutation<
    unknown,
    unknown,
    string,
    never,
    Invitation[]
  >(
    `user/invitations`,
    () => hcb.post(`user/invitations/${inviteId}/reject`).json(),
    {
      populateCache: (_, invitations) =>
        invitations?.filter((i) => i.id != inviteId) || [],
      onSuccess: () => {
        mutate("user/invitations");
        router.back();
      },
      onError: async (err) => {
        showAlert(
          "Failed to Decline Invitation",
          await parseApiError(err, "Please try again."),
          [{ text: "OK" }],
        );
      },
    },
  );

  const org = invitation?.organization;
  const categoryLabel = org?.category
    ? CATEGORY_LABELS[org.category]
    : undefined;

  return (
    <View
      style={{
        padding: 20,
        justifyContent: "center",
        flex: 1,
      }}
    >
      {invitation && org ? (
        <View
          style={{
            backgroundColor: themeColors.card,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: cardBorderColor(isDark),
            padding: 24,
            paddingTop: 32,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <View style={{ marginBottom: 20 }}>
              {org.icon ? (
                <Image
                  source={{ uri: org.icon }}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  style={{ width: 72, height: 72, borderRadius: 14 }}
                />
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 14,
                    backgroundColor: orgColor(org.id),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 30, fontWeight: "600" }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {invitation.sender && (
                <UserAvatar
                  user={invitation.sender}
                  size={28}
                  style={{
                    position: "absolute",
                    bottom: -8,
                    right: -8,
                    borderWidth: 2,
                    borderColor: themeColors.card,
                  }}
                />
              )}
            </View>

            <Text
              style={{
                color: subTextColor(isDark),
                fontSize: 12,
                fontWeight: "600",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              You've been invited to join
            </Text>
            <Text
              style={{
                color: themeColors.text,
                textAlign: "center",
                fontSize: 28,
                fontWeight: "700",
              }}
            >
              {org.name}
            </Text>

            {(categoryLabel || org.playground_mode) && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 12,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {categoryLabel && (
                  <View
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                      paddingVertical: 3,
                      paddingHorizontal: 10,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        color: subTextColor(isDark),
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      {categoryLabel}
                    </Text>
                  </View>
                )}
                {org.playground_mode && (
                  <View
                    style={{
                      backgroundColor: isDark ? "#1a2d45" : "#dbeeff",
                      paddingVertical: 3,
                      paddingHorizontal: 10,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        color: isDark ? "#6cb4f5" : "#1a6fbf",
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      Playground
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: cardBorderColor(isDark),
              marginVertical: 20,
            }}
          />

          <View style={{ gap: 10 }}>
            {invitation.sender && (
              <DetailRow icon="person-outline" isDark={isDark}>
                Invited by{" "}
                <Text style={{ fontWeight: "600", color: themeColors.text }}>
                  {invitation.sender.name}
                </Text>
              </DetailRow>
            )}
            {invitation.created_at && (
              <DetailRow icon="calendar-outline" isDark={isDark}>
                Sent {renderDate(invitation.created_at)}
              </DetailRow>
            )}
            {org.transparent && (
              <DetailRow icon="eye-outline" isDark={isDark}>
                Transparent finances
              </DetailRow>
            )}
          </View>

          <View style={{ gap: 10, marginTop: 24 }}>
            <Button
              variant="success"
              onPress={() => accept()}
              loading={acceptIsLoading}
              icon="member-add"
              iconSize={24}
              iconOffset={4}
              iconPosition="left"
            >
              Join {org.name}
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                showAlert(
                  "Are you sure you want to decline this invitation?",
                  undefined,
                  [
                    { text: "Cancel" },
                    {
                      text: "Decline",
                      style: "destructive",
                      onPress: () => reject(),
                    },
                  ],
                )
              }
              loading={rejectIsLoading}
            >
              Decline
            </Button>
          </View>
        </View>
      ) : invitationError ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Ionicons
            name="cloud-offline-outline"
            size={40}
            color={palette.muted}
          />
          <Text
            style={{
              color: palette.muted,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Couldn't load this invitation.
          </Text>
          <Button onPress={() => retryInvitation()}>Retry</Button>
        </View>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
