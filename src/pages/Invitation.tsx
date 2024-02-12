import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useContext } from "react";
import {
  View,
  Text,
  Alert,
  StatusBar,
  TouchableHighlight,
  ActivityIndicator,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import AuthContext from "../auth";
import Button from "../components/Button";
import { StackParamList } from "../lib/NavigatorParamList";
import Invitation from "../lib/types/Invitation";
import palette from "../palette";
import { palette as p } from "../theme";

type Props = NativeStackScreenProps<StackParamList, "Invitation">;

export default function InvitationPage({
  navigation,
  route: {
    params: { inviteId, invitation: _invitation },
  },
}: Props) {
  const { token } = useContext(AuthContext);

  const { data: invitation } = useSWR<Invitation>(
    `/user/invitations/${inviteId}`,
    { fallbackData: _invitation },
  );

  const { mutate } = useSWRConfig();

  const { colors: themeColors } = useTheme();

  const { trigger: accept, isMutating: acceptIsLoading } = useSWRMutation<
    unknown,
    unknown,
    string,
    never,
    Invitation[]
  >(
    `/user/invitations`,
    () =>
      fetch(
        process.env.EXPO_PUBLIC_API_BASE +
          `/user/invitations/${inviteId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      ),
    {
      populateCache: (_, invitations) =>
        invitations?.filter((i) => i.id != inviteId) || [],
      onSuccess: () => {
        navigation.goBack(); // Close modal
        if (invitation) {
          navigation.navigate("Event", {
            orgId: invitation.organization.id,
            organization: invitation.organization,
          });
        }
        mutate(`/user/organizations`);
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
    `/user/invitations`,
    () =>
      fetch(
        process.env.EXPO_PUBLIC_API_BASE +
          `/user/invitations/${inviteId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      ),
    {
      populateCache: (_, invitations) =>
        invitations?.filter((i) => i.id != inviteId) || [],
      onSuccess: () => navigation.goBack(),
    },
  );

  return (
    <View
      style={{
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <StatusBar barStyle="light-content" />

      <TouchableHighlight
        onPress={() => navigation.goBack()}
        style={{ position: "absolute", top: 16, right: 16 }}
      >
        <Ionicons name="close-circle" color={p.muted} size={30} />
      </TouchableHighlight>

      {invitation ? (
        <>
          <Text
            style={{
              color: p.muted,
              fontSize: 12,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            You've been invited to join
          </Text>
          <Text
            style={{
              color: themeColors.text,
              textAlign: "center",
              fontSize: 36,
              fontWeight: "700",
              marginBottom: 30,
            }}
          >
            {invitation.organization.name}
          </Text>

          <View style={{ flexDirection: "row", gap: 20 }}>
            <Button
              onPress={() => accept()}
              style={{
                backgroundColor: palette.emerald["400"],
                borderTopColor: palette.emerald["300"],
                minWidth: 100,
              }}
              color={palette.emerald["800"]}
              loading={acceptIsLoading}
            >
              Join
            </Button>
            <Button
              style={{ minWidth: 100 }}
              onPress={() =>
                Alert.alert(
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
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
