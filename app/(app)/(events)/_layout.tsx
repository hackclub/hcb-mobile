import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { ComponentProps, useContext, useEffect } from "react";
import { Pressable } from "react-native";

import AuthContext from "@/lib/auth/auth";

// Anchor the stack to the org list so a deep link isn't the bottom of the
// history. Without it, opening /hcb/<id> from outside the app made the
// transaction the first route, `canGoBack()` was false, and the header rendered
// with no back button and no way out. Expo Router resolves the default anchor by
// looking for a child named after the group — there is no `events` route, so it
// has to be set explicitly.
export const unstable_settings = {
  anchor: "index",
};

const MANAGE_GRANT_OPTIONS: ComponentProps<typeof Stack.Screen>["options"] = {
  presentation: "formSheet",
  title: "Manage Grant",
  headerShown: true,
  headerTransparent: false,
  headerBlurEffect: "systemMaterial",
  sheetAllowedDetents: [0.75, 1.0],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  headerRight: () => (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <Ionicons name="close" size={28} color="#8e8e93" />
    </Pressable>
  ),
};

function AuthRedirect() {
  const { tokenResponse } = useContext(AuthContext);

  useEffect(() => {
    if (!tokenResponse) router.replace("/login");
  }, [tokenResponse]);

  return null;
}

export default function Layout() {
  return (
    <>
      <AuthRedirect />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: "transparent" },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Organizations", headerLargeTitle: true }}
        />
        <Stack.Screen name="[id]/index" options={{ title: "" }} />
        <Stack.Screen name="[id]/team" options={{ title: "Team" }} />
        <Stack.Screen
          name="[id]/transfers/index"
          options={{ title: "Transfer money" }}
        />
        <Stack.Screen
          name="[id]/transfers/ach"
          options={{ title: "ACH Transfer" }}
        />
        <Stack.Screen
          name="[id]/transfers/check"
          options={{ title: "Mail a Check" }}
        />
        <Stack.Screen
          name="[id]/transfers/hcb"
          options={{ title: "HCB Transfer" }}
        />
        <Stack.Screen
          name="[id]/transfers/select-org"
          options={{
            presentation: "formSheet",
            title: "Select organization",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.75, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/transfers/select-country"
          options={{
            presentation: "formSheet",
            title: "Select a country",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.75, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/cards/index"
          options={{ title: "Cards", headerLargeTitle: true }}
        />
        <Stack.Screen name="[id]/cards/[cardId]" options={{ title: "" }} />
        <Stack.Screen
          name="[id]/cards/order"
          options={{ title: "Order a Card" }}
        />
        <Stack.Screen
          name="[id]/transactions/index"
          options={{ title: "Transactions" }}
        />
        <Stack.Screen
          name="[id]/transactions/[transactionId]/index"
          options={{ title: "Transaction" }}
        />
        {/* Deep-link target for shared /hcb/<id> transaction permalinks. */}
        <Stack.Screen
          name="hcb/[transactionId]/index"
          options={{ title: "Transaction" }}
        />
        <Stack.Screen
          name="hcb/[transactionId]/attach_receipt"
          options={{ title: "Transaction" }}
        />
        <Stack.Screen
          name="[id]/transactions/[transactionId]/rename"
          options={{
            presentation: "formSheet",
            title: "Rename Transaction",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.5, 0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/transactions/filter"
          options={{
            presentation: "formSheet",
            title: "Filter Transactions",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.75, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/account-numbers"
          options={{
            presentation: "formSheet",
            title: "Account Numbers",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.5, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/invite"
          options={{
            presentation: "formSheet",
            title: "Invite a Teammate",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.6, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/remove-member"
          options={{
            presentation: "formSheet",
            title: "Request removal",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.6, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/donations/index"
          options={{ title: "Donations" }}
        />
        <Stack.Screen
          name="[id]/donations/[donationId]"
          options={{ title: "Donation" }}
        />
        <Stack.Screen
          name="[id]/donations/new"
          options={{ title: "New Donation", headerTransparent: false }}
        />
        {/* Deep-link target for public /donations/start/<slug> links. */}
        <Stack.Screen
          name="donations/start/[slug]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="[id]/donations/process"
          options={{ presentation: "modal", title: "Process Donation" }}
        />
        <Stack.Screen
          name="[id]/check-deposits/new"
          options={{
            presentation: "formSheet",
            title: "Deposit a Check",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.75, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/check-deposits/index"
          options={{ title: "Check Deposits", headerLargeTitle: true }}
        />
        <Stack.Screen
          name="[id]/check-deposits/[depositId]"
          options={{ title: "Check Deposit" }}
        />
        <Stack.Screen
          name="[id]/sub-organizations"
          options={{ title: "Sub-organizations" }}
        />
        <Stack.Screen
          name="[id]/reimbursements/index"
          options={{ title: "Reimbursements", headerLargeTitle: true }}
        />
        <Stack.Screen
          name="[id]/reimbursements/[reportId]/index"
          options={{ title: "Report" }}
        />
        <Stack.Screen
          name="[id]/reimbursements/[reportId]/edit-report"
          options={{
            presentation: "formSheet",
            title: "Edit report",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.6, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/reimbursements/[reportId]/new-expense"
          options={{
            presentation: "formSheet",
            title: "Add Expense",
            headerShown: true,
            headerTransparent: false,
            headerBlurEffect: "systemMaterial",
            sheetAllowedDetents: [0.85, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            headerRight: () => (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={28} color="#8e8e93" />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="[id]/card-grants/new"
          options={{ title: "Card grant" }}
        />
        <Stack.Screen
          name="card-grants/[id]/index"
          options={{ title: "Grant Card" }}
        />
        <Stack.Screen
          name="card-grants/[id]/manage"
          options={MANAGE_GRANT_OPTIONS}
        />
        <Stack.Screen
          name="invitation/[id]"
          options={{ title: "Invitation" }}
        />
        <Stack.Screen name="invites/[id]" options={{ title: "Invitation" }} />
        <Stack.Screen
          name="grants/[id]/index"
          options={{ title: "Grant Card" }}
        />
        <Stack.Screen
          name="grants/[id]/manage"
          options={MANAGE_GRANT_OPTIONS}
        />
        <Stack.Screen name="stripe_cards/[id]" options={{ title: "" }} />
      </Stack>
    </>
  );
}
