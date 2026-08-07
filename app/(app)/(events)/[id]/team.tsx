import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect, useTheme } from "expo-router/react-navigation";
import { capitalize } from "lodash";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import UserAvatar from "@/components/UserAvatar";
import { parseApiError, showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrganizerPositionPolicy, OrgPolicy } from "@/lib/policies";
import { PaginatedResponse } from "@/lib/types/HcbApiObject";
import { OrganizationExpanded } from "@/lib/types/Organization";
import OrganizerPosition from "@/lib/types/OrganizerPosition";
import User from "@/lib/types/User";
import { useIsDark } from "@/lib/useColorScheme";
import { useHeaderInset } from "@/lib/useHeaderInset";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette, subTextColor } from "@/styles/theme";

interface OrgInvitation {
  id: string;
  organization_id: string;
  role?: "member" | "manager";
  accepted: boolean;
  created_at: string;
  invitee: User;
  sender: User;
}

type FilterTab = "all" | "reader" | "member" | "manager";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reader", label: "Readers" },
  { key: "member", label: "Members" },
  { key: "manager", label: "Managers" },
];

function roleColor(role?: OrganizerPosition["role"]) {
  if (role === "manager") return palette.warning;
  return palette.info;
}

function MemberCard({
  position,
  canRemove,
  onRemove,
}: {
  position: OrganizerPosition;
  canRemove: boolean;
  onRemove: (position: OrganizerPosition) => void;
}) {
  const user = position.user;
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const borderColor = cardBorderColor(isDark);
  const subColor = subTextColor(isDark);

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <UserAvatar user={user} size={52} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 16,
              fontWeight: "700",
              lineHeight: 20,
            }}
          >
            {user.name}
          </Text>
          <Text
            style={{
              color: roleColor(position.role),
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {capitalize(position.role ?? "member")}
            {position.signee ? " · Signee" : ""}
          </Text>
        </View>
        {canRemove && (
          <Pressable
            onPress={() => onRemove(position)}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 30,
              height: 30,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: isDark
                ? "rgba(255,80,80,0.4)"
                : "rgba(200,0,0,0.25)",
              backgroundColor: isDark
                ? "rgba(255,80,80,0.08)"
                : "rgba(255,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons name="person-remove-outline" size={15} color="#e85d5d" />
          </Pressable>
        )}
      </View>

      {user.email && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="mail-outline" size={13} color={subColor} />
          <Text
            style={{ color: subColor, fontSize: 12, flex: 1 }}
            numberOfLines={1}
          >
            {user.email}
          </Text>
        </View>
      )}

      <Text style={{ color: subColor, fontSize: 12 }}>
        Joined{" "}
        {formatDistanceToNowStrict(parseISO(position.created_at), {
          addSuffix: true,
        })}
      </Text>
    </View>
  );
}

function InvitationCard({
  invite,
  onCancel,
}: {
  invite: OrgInvitation;
  onCancel: (id: string) => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const borderColor = cardBorderColor(isDark);
  const subColor = subTextColor(isDark);

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <UserAvatar user={invite.invitee} size={52} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 15,
              fontWeight: "600",
            }}
            numberOfLines={1}
          >
            {invite.invitee.name || invite.invitee.email}
          </Text>
          <Text
            style={{ color: subColor, fontSize: 13, marginTop: 2 }}
            numberOfLines={1}
          >
            {invite.invitee.email}
          </Text>
          <Text style={{ color: subColor, fontSize: 13, marginTop: 2 }}>
            {invite.role ? capitalize(invite.role) : "Member"}
          </Text>
        </View>
        <Pressable
          onPress={() => onCancel(invite.id)}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 30,
            height: 30,
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: isDark ? "rgba(255,80,80,0.4)" : "rgba(200,0,0,0.25)",
            backgroundColor: isDark
              ? "rgba(255,80,80,0.08)"
              : "rgba(255,0,0,0.04)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Ionicons name="close" size={16} color="#e85d5d" />
        </Pressable>
      </View>
      <Text style={{ color: subColor, fontSize: 12 }}>
        Invited by {invite.sender.name}{" "}
        {formatDistanceToNowStrict(parseISO(invite.created_at), {
          addSuffix: true,
        })}
      </Text>
    </View>
  );
}

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cache } = useSWRConfig();
  const hcb = useClient();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const { bottom: tabBarHeight } = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: organization, mutate: reloadOrganization } =
    useOfflineSWR<OrganizationExpanded>(`organizations/${id}?avatar_size=50`, {
      fallbackData: cache.get(`organizations/${id}`)?.data,
    });

  const { data: currentUser } = useOfflineSWR<User>("user");

  const { data: positionsPage, mutate: reloadPositions } = useOfflineSWR<
    PaginatedResponse<OrganizerPosition>
  >(
    `organizer_positions?organization_id=${id}&expand=user&avatar_size=50&limit=100`,
  );

  const positions = positionsPage?.data;

  const policyOrg = useMemo(() => {
    if (!organization) return null;
    if (!positions) return organization;
    return {
      ...organization,
      users: positions.map((p) => ({
        ...p.user,
        role: p.role,
        joined_at: p.created_at,
      })),
    };
  }, [organization, positions]);

  const canManage = policyOrg
    ? new OrgPolicy(currentUser ?? null, policyOrg).canInviteUser()
    : false;

  const { data: invitations, mutate: reloadInvitations } = useOfflineSWR<
    OrgInvitation[]
  >(
    canManage
      ? `organizations/${id}/invitations?organization_id=${id}&expand=sender,invitee`
      : null,
  );

  useFocusEffect(
    useCallback(() => {
      reloadPositions();
      if (canManage) reloadInvitations();
    }, [canManage, reloadPositions, reloadInvitations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadOrganization(),
        reloadPositions(),
        canManage ? reloadInvitations() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [reloadOrganization, reloadPositions, reloadInvitations, canManage]);

  const requestRemoval = useCallback(
    (position: OrganizerPosition) => {
      router.push({
        pathname: "/(events)/[id]/remove-member",
        params: {
          id,
          positionId: position.id,
          name: position.user.name,
          self: position.user.id === currentUser?.id ? "1" : "0",
        },
      });
    },
    [id, currentUser],
  );

  const cancelInvitation = useCallback(
    (inviteId: string) => {
      Alert.alert(
        "Cancel invitation?",
        "This will revoke the pending invite.",
        [
          { text: "Keep" },
          {
            text: "Cancel invite",
            style: "destructive",
            onPress: async () => {
              try {
                await hcb.delete(`organizations/${id}/invitations/${inviteId}`);
                reloadInvitations();
              } catch (error) {
                showAlert(
                  "Failed to cancel",
                  await parseApiError(error, "Please try again."),
                );
              }
            },
          },
        ],
      );
    },
    [hcb, id, reloadInvitations],
  );

  const filteredPositions = useMemo(() => {
    let result = positions ?? [];
    if (activeTab !== "all") {
      result = result.filter((p) => p.role === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.user.name.toLowerCase().includes(q));
    }
    return result;
  }, [positions, activeTab, search]);

  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const tabActiveBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  if (!organization) return null;

  type ListItem =
    | { type: "header" }
    | { type: "member"; position: OrganizerPosition }
    | { type: "invitations-header" }
    | { type: "invitation"; invite: OrgInvitation };

  const listData: ListItem[] = [{ type: "header" }];

  for (const position of filteredPositions) {
    listData.push({ type: "member", position });
  }

  const pendingInvitations = (invitations ?? []).filter(
    (invite) => !invite.accepted,
  );

  if (canManage && pendingInvitations.length > 0) {
    listData.push({ type: "invitations-header" });
    for (const invite of pendingInvitations) {
      listData.push({ type: "invitation", invite });
    }
  }

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: headerInset,
        paddingBottom: tabBarHeight + 20,
        gap: 10,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        if (item.type === "header") {
          return (
            <View style={{ gap: 12, paddingTop: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "700",
                      color: themeColors.text,
                    }}
                  >
                    Team
                  </Text>
                  <View
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.08)",
                      borderRadius: 12,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {positionsPage?.total_count ?? positions?.length ?? 0}
                    </Text>
                  </View>
                </View>
                {canManage && (
                  <Button
                    variant="green"
                    icon="member-add"
                    iconSize={28}
                    iconOffset={4}
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
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: inputBg,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 8,
                }}
              >
                <Ionicons name="search" size={16} color={palette.muted} />
                <TextInput
                  placeholder="Search members..."
                  placeholderTextColor={palette.muted}
                  value={search}
                  onChangeText={setSearch}
                  style={{
                    flex: 1,
                    color: themeColors.text,
                    fontSize: 15,
                    padding: 0,
                  }}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={palette.muted}
                    />
                  </Pressable>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 6 }}>
                {TABS.map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor:
                        activeTab === tab.key ? themeColors.text : tabActiveBg,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color:
                          activeTab === tab.key
                            ? themeColors.background
                            : palette.muted,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }

        if (item.type === "member") {
          return (
            <MemberCard
              position={item.position}
              canRemove={new OrganizerPositionPolicy(
                currentUser ?? null,
                item.position,
                policyOrg,
              ).canRequestRemoval()}
              onRemove={requestRemoval}
            />
          );
        }

        if (item.type === "invitations-header") {
          return (
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: palette.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginTop: 8,
              }}
            >
              Pending Invitations
            </Text>
          );
        }

        if (item.type === "invitation") {
          return (
            <InvitationCard invite={item.invite} onCancel={cancelInvitation} />
          );
        }

        return null;
      }}
    />
  );
}
