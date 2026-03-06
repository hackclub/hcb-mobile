import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "components/Text";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  StatusBar,
  TouchableHighlight,
  View,
} from "react-native";
import { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

import Button from "@/components/Button";
import { showAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import Invitation from "@/lib/types/Invitation";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import palette from "@/styles/palette";
import { palette as themePalette } from "@/styles/theme";

export default function Page() {
  const hcb = useClient();
  const { id: inviteId, invitation: _invitation } = useLocalSearchParams<{
    id: string;
    invitation?: string;
  }>();

  let fallbackInvitation: Invitation | undefined;
  try {
    fallbackInvitation = _invitation
      ? JSON.parse(_invitation as string)
      : undefined;
  } catch {
    fallbackInvitation = undefined;
  }

  const { data: invitation } = useOfflineSWR<Invitation>(
    `user/invitations/${inviteId}`,
    { fallbackData: fallbackInvitation },
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
      onError: () => {
        showAlert(
          "Failed to Accept Invitation",
          "You may have to sign the contract. Please contact HCB support if you believe this is an error.",
          [
            {
              text: "OK",
            },
          ],
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
        onPress={() => router.back()}
        style={{ position: "absolute", top: 16, right: 16 }}
        underlayColor={themeColors.background}
      >
        <Ionicons name="close-circle" color={themePalette.muted} size={30} />
      </TouchableHighlight>

      {invitation ? (
        <>
          <Text
            style={{
              color: themePalette.muted,
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
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
