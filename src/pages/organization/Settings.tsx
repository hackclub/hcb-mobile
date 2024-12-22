import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { capitalize } from "lodash";
import { Linking, ScrollView, Text, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";

import Button from "../../components/Button";
import UserAvatar from "../../components/UserAvatar";
import { StackParamList } from "../../lib/NavigatorParamList";
import { OrganizationExpanded } from "../../lib/types/Organization";
import User, { OrgUser } from "../../lib/types/User";
import { palette } from "../../theme";

type Props = NativeStackScreenProps<StackParamList, "OrganizationSettings">;

function MemberRole(props: { role: OrgUser["role"] }) {
  return (
    <Text
      style={{
        fontSize: 16,
        color: props.role == "manager" ? palette.warning : palette.info,
        marginLeft: "auto",
      }}
    >
      {capitalize(props.role)}
    </Text>
  );
}

export default function OrganizationSettingsPage({
  route: {
    params: { orgId },
  },
}: Props) {
  const { cache } = useSWRConfig();
  const { data: organization } = useSWR<OrganizationExpanded>(
    `organizations/${orgId}?avatar_size=50`,
    { fallbackData: cache.get(`organizations/${orgId}`)?.data },
  );
  const { data: currentUser } = useSWR<User>("user");

  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors } = useTheme();

  if (!organization) return null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: tabBarHeight + 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight - 20 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 18 }}>Members</Text>
        <Button
          icon="add-circle-outline"
          onPress={() =>
            Linking.openURL(
              `https://hcb.hackclub.com/${organization.slug}/invites/new`,
            )
          }
        >
          Invite
        </Button>
      </View>
      <View
        style={{
          borderRadius: 8,
          overflow: "hidden",
          padding: 8,
          backgroundColor: themeColors.card,
        }}
      >
        {organization.users.map((user) => (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              padding: 8,
            }}
            key={user.id}
          >
            <UserAvatar user={user} size={50} />
            <View
              style={{
                flex: 1,
                justifyContent: "space-around",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={{ color: themeColors.text, fontSize: 18 }}
                  numberOfLines={1}
                >
                  {user.name}
                </Text>
{/*                 {user.id == currentUser?.id && (
                  <Text style={{ fontSize: 12, color: palette.success }}>
                    (that's you!)
                  </Text>
                )} */}
                {user.role && <MemberRole role={user.role} />}
              </View>
              <Text style={{ color: palette.muted }}>
                Added {formatDistanceToNowStrict(parseISO(user.joined_at))} ago
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
