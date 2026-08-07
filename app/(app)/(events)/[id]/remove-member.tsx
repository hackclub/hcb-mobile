import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { mutate as globalMutate } from "swr";

import {
  FooterNote,
  FormField,
  FormSection,
  NoticeCallout,
  TransferSubmitButton,
} from "@/components/organizations/transfer/TransferFormUI";
import { parseApiError, showFailureAlert } from "@/lib/alertUtils";
import useClient from "@/lib/client";
import { toast } from "@/lib/toast";
import { palette } from "@/styles/theme";

export default function RemoveMemberPage() {
  const { id, positionId, name, self } = useLocalSearchParams<{
    id: string;
    positionId: string;
    name: string;
    self?: string;
  }>();
  const hcb = useClient();

  const isSelf = self === "1";
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.warning(
        "Reason required",
        isSelf
          ? "Tell HCB why you're leaving."
          : `Tell HCB why ${name} should lose access.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await hcb.post(`organizer_positions/${positionId}/removal_request`, {
        json: { reason: trimmed },
      });
      await globalMutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`organizer_positions?organization_id=${id}`),
      );
      toast.success("Removal requested", "HCB will review this request.");
      router.back();
    } catch (error) {
      showFailureAlert(
        "Failed to request removal",
        await parseApiError(error, "Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // No backgroundColor: this is a formSheet with a systemMaterial header, so
    // an opaque fill defeats the native sheet translucency.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <NoticeCallout
          title={isSelf ? "Leaving this organization" : `Removing ${name}`}
          color={palette.warning}
          icon="alert-circle-outline"
        >
          {isSelf
            ? "You keep access until HCB approves this request."
            : `${name} keeps access until HCB approves this request.`}
        </NoticeCallout>

        <FormSection>
          <FormField
            label={isSelf ? "Reason for leaving" : "Reason for removal"}
            description={
              isSelf
                ? "Tell HCB why you're leaving."
                : `Tell HCB why ${name} should lose access.`
            }
            value={reason}
            onChangeText={setReason}
            placeholder={
              isSelf
                ? "I'm no longer involved with this organization"
                : "They've graduated and are no longer involved"
            }
            multiline
            numberOfLines={4}
            style={{ minHeight: 88, textAlignVertical: "top" }}
          />
        </FormSection>

        <View style={{ gap: 10 }}>
          <TransferSubmitButton
            onPress={submit}
            loading={submitting}
            disabled={submitting || !reason.trim()}
            icon={isSelf ? "door-leave" : "member-remove"}
          >
            {isSelf ? "Request to leave" : "Request removal"}
          </TransferSubmitButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
