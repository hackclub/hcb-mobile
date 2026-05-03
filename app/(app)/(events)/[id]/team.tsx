import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
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
import { useSWRConfig } from "swr";

import Button from "@/components/Button";
import UserAvatar from "@/components/UserAvatar";
import { showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { OrgPolicy } from "@/lib/policies";
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

type FilterTab = "all" | "reader" | "member" | "manager";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reader", label: "Readers" },
  { key: "member", label: "Members" },
  { key: "manager", label: "Managers" },
];

function roleColor(role?: OrgUser["role"]) {
  if (role === "manager") return palette.warning;
  return palette.info;
}

function MemberCard({
  user,
  canManage,
  onRemove,
  isDark,
  themeColors,
}: {
  user: OrgUser;
  canManage: boolean;
  onRemove: (user: OrgUser) => void;
  isDark: boolean;
  themeColors: ReturnType<typeof useTheme>["colors"];
}) {
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  const actionBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 14,
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
            style={{ color: roleColor(user.role), fontSize: 13, marginTop: 2 }}
          >
            {capitalize(user.role ?? "member")}
          </Text>
        </View>
        {canManage && (
          <Pressable
            onPress={() => onRemove(user)}
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="mail-outline" size={13} color={subColor} />
        <Text
          style={{ color: subColor, fontSize: 12, flex: 1 }}
          numberOfLines={1}
        >
          {user.email}
        </Text>
      </View>

      <Text style={{ color: subColor, fontSize: 12 }}>
        Joined{" "}
        {formatDistanceToNowStrict(parseISO(user.joined_at), {
          addSuffix: true,
        })}
      </Text>
    </View>
  );
}

function InvitationCard({
  invite,
  onCancel,
  isDark,
  themeColors,
}: {
  invite: OrgInvitation;
  onCancel: (id: string) => void;
  isDark: boolean;
  themeColors: ReturnType<typeof useTheme>["colors"];
}) {
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

  return (
    <View
      style={{
        backgroundColor: themeColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="mail-outline" size={22} color={subColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: themeColors.text,
              fontSize: 15,
              fontWeight: "600",
            }}
            numberOfLines={1}
          >
            {invite.email}
          </Text>
          <Text style={{ color: subColor, fontSize: 13, marginTop: 2 }}>
            {invite.role ? capitalize(invite.role) : "Member"} · Pending
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
        Invited{" "}
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
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: organization, mutate: reloadOrganization } =
    useOfflineSWR<OrganizationExpanded>(
      `organizations/${id}?avatar_size=50`,
      { fallbackData: cache.get(`organizations/${id}`)?.data },
    );

  const { data: currentUser } = useOfflineSWR<User>("user");

  const canManage = organization
    ? new OrgPolicy(currentUser ?? null, organization).canInviteUser()
    : false;

  const {
    data: invitations,
    mutate: reloadInvitations,
    isLoading: invitationsLoading,
  } = useOfflineSWR<OrgInvitation[]>(
    canManage ? `organizations/${id}/invitations` : null,
    );

  console.log(invitations)

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

  const removeUser = useCallback(
    (user: OrgUser) => {
      Alert.alert(
        `Remove ${user.name}?`,
        "They will lose access to this organization.",
        [
          { text: "Cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await hcb.delete(`organizations/${id}/users/${user.id}`);
                reloadOrganization();
              } catch {
                showAlert("Failed to remove", "Please try again.");
              }
            },
          },
        ],
      );
    },
    [hcb, id, reloadOrganization],
  );

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

  const filteredUsers = useMemo(() => {
    if (!organization) return [];
    let users = organization.users;
    if (activeTab !== "all") {
      users = users.filter((u) => u.role === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(q));
    }
    return users;
  }, [organization, activeTab, search]);

  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const tabActiveBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  if (!organization) return null;

  type ListItem =
    | { type: "header" }
    | { type: "member"; user: OrgUser }
    | { type: "invitations-header" }
    | { type: "invitation"; invite: OrgInvitation };

  const listData: ListItem[] = [{ type: "header" }];

  for (const user of filteredUsers) {
    listData.push({ type: "member", user });
  }

  if (canManage && invitations && invitations.length > 0) {
    listData.push({ type: "invitations-header" });
    for (const invite of invitations) {
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
                      {organization.users.length}
                    </Text>
                  </View>
                </View>
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
              user={item.user}
              canManage={canManage}
              onRemove={removeUser}
              isDark={isDark}
              themeColors={themeColors}
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
            <InvitationCard
              invite={item.invite}
              onCancel={cancelInvitation}
              isDark={isDark}
              themeColors={themeColors}
            />
          );
        }

        return null;
      }}
    />
  );
}
