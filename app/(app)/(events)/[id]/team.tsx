import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import PageTitle from "components/PageTitle";
import { Text } from "components/Text";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { capitalize } from "lodash";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import UserAvatar from "@/components/UserAvatar";
import { showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizationExpanded } from "@/lib/types/Organization";
import User, { OrgUser } from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

interface OrgInvitation {
  id: string;
  email: string;
  role?: "member" | "manager";
  created_at: string;
}

function MemberRole({ role }: { role: OrgUser["role"] }) {
  return (
    <Text
      style={{
        fontSize: 16,
        color: role === "manager" ? palette.warning : palette.info,
        marginLeft: "auto",
      }}
    >
      {capitalize(role)}
    </Text>
  );
}

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cache } = useSWRConfig();
  const hcb = useClient();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const { bottom: tabBarHeight } = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: organization, mutate: reloadOrganization } =
    useOfflineSWR<OrganizationExpanded>(
      `organizations/${id}?avatar_size=50`,
      { fallbackData: cache.get(`organizations/${id}`)?.data },
    );

  const { data: currentUser } = useOfflineSWR<User>("user");

  const currentUserRole = organization?.users.find(
    (u) => u.id === currentUser?.id,
  )?.role;
  const canManage =
    currentUserRole === "manager" || currentUser?.admin === true;

  const {
    data: invitations,
    mutate: reloadInvitations,
    isLoading: invitationsLoading,
  } = useOfflineSWR<OrgInvitation[]>(
    canManage ? `organizations/${id}/invitations` : null,
  );

  useFocusEffect(
    useCallback(() => {
      if (canManage) reloadInvitations();
    }, [canManage, reloadInvitations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadOrganization(),
        canManage ? reloadInvitations() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [reloadOrganization, reloadInvitations, canManage]);

  const cancelInvitation = useCallback(
    (inviteId: string) => {
      Alert.alert("Cancel invitation?", "This will revoke the pending invite.", [
        { text: "Keep" },
        {
          text: "Cancel invite",
          style: "destructive",
          onPress: async () => {
            try {
              await hcb.delete(`organizations/${id}/invitations/${inviteId}`);
              reloadInvitations();
            } catch {
              showAlert("Failed to cancel", "Please try again.");
            }
          },
        },
      ]);
    },
    [hcb, id, reloadInvitations],
  );

  if (!organization) return null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: tabBarHeight + 20,
      }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <PageTitle title="Team">
          {canManage && (
            <Button
              icon="member-add"
              iconSize={28}
              iconOffset={2}
              onPress={() =>
                router.push({
                  pathname: "/(events)/[id]/invite",
                  params: { id },
                })
              }
            >
              Invite
            </Button>
          )}
        </PageTitle>
      </View>

      {/* Members */}
      <View
        style={{
          borderRadius: 8,
          overflow: "hidden",
          padding: 8,
          backgroundColor: themeColors.card,
          marginBottom: 20,
        }}
      >
        {organization.users.map((user) => (
          <View
            key={user.id}
            style={{ flexDirection: "row", gap: 10, padding: 8 }}
          >
            <UserAvatar user={user} size={50} />
            <View style={{ flex: 1, justifyContent: "space-around" }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text
                  style={{
                    color: themeColors.text,
                    fontSize: 18,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {user.name}
                </Text>
                {user.role && <MemberRole role={user.role} />}
              </View>
              <Text style={{ color: palette.muted }}>
                Added {formatDistanceToNowStrict(parseISO(user.joined_at))} ago
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pending invitations */}
      {canManage && (
        <>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: palette.muted,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Pending Invitations
          </Text>

          {invitationsLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : invitations && invitations.length > 0 ? (
            <View
              style={{
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: themeColors.card,
              }}
            >
              {invitations.map((invite, index) => (
                <View
                  key={invite.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.07)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={palette.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.text,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                      numberOfLines={1}
                    >
                      {invite.email}
                    </Text>
                    {invite.role && (
                      <Text style={{ color: palette.muted, fontSize: 13 }}>
                        Invited as {capitalize(invite.role)}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => cancelInvitation(invite.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={palette.muted}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: palette.muted,
                fontSize: 15,
                textAlign: "center",
                paddingVertical: 16,
              }}
            >
              No pending invitations
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
