import Icon from "@thedev132/hackclub-icons-rn";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { Linking, Pressable, ScrollView, View } from "react-native";

import WiseIcon from "@/components/icons/WiseIcon";
import { Text } from "@/components/Text";
import { showAlert } from "@/lib/alertUtils";
import { OrganizationExpanded } from "@/lib/types/Organization";
import { useIsDark } from "@/lib/useColorScheme";
import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { cardBorderColor, palette, radii } from "@/styles/theme";
import * as Haptics from "@/utils/haptics";
import { shareUrl } from "@/utils/shareUrl";

interface TransferOption {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  renderIcon: (color: string) => React.ReactNode;
  onPress: (id: string) => void;
}

export default function TransfersPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const { data: organization } = useOfflineSWR<OrganizationExpanded>(
    `organizations/${id}`,
  );

  const openWiseTransfer = () => {
    if (!organization?.slug) {
      showAlert(
        "Not available yet",
        "We're still loading this organization. Please try again in a moment.",
      );
      return;
    }
    Linking.openURL(shareUrl.wiseTransfer(organization.slug));
  };

  const options: TransferOption[] = [
    {
      id: "ach",
      title: "ACH transfer",
      subtitle: "United States",
      renderIcon: (color) => (
        <Icon glyph="payment-transfer" size={26} color={color} />
      ),
      onPress: () =>
        router.push({
          pathname: "/(events)/[id]/transfers/ach",
          params: { id },
        }),
    },
    {
      id: "check",
      title: "Mailed check",
      subtitle: "United States",
      renderIcon: (color) => <Icon glyph="email" size={26} color={color} />,
      onPress: () =>
        router.push({
          pathname: "/(events)/[id]/transfers/check",
          params: { id },
        }),
    },
    {
      id: "wise",
      title: "Wise transfer",
      subtitle: "International",
      badge: "Web only",
      renderIcon: (color) => <WiseIcon size={24} color={color} />,
      onPress: openWiseTransfer,
    },
    {
      id: "wire",
      title: "Wire transfer",
      subtitle: "International",
      badge: "$500 minimum",
      renderIcon: (color) => <Icon glyph="web" size={26} color={color} />,
      onPress: () =>
        router.push({
          pathname: "/(events)/[id]/transfers/wire",
          params: { id },
        }),
    },
    {
      id: "hcb",
      title: "HCB transfer",
      subtitle: "Any HCB organization",
      renderIcon: (color) => (
        <Icon glyph="bank-account" size={26} color={color} />
      ),
      onPress: () =>
        router.push({
          pathname: "/(events)/[id]/transfers/hcb",
          params: { id },
        }),
    },
    {
      id: "grant",
      title: "Card grant",
      subtitle: "A grant sent through HCB",
      renderIcon: (color) => <Icon glyph="card" size={26} color={color} />,
      onPress: () =>
        router.push({
          pathname: "/(events)/[id]/card-grants/new",
          params: { id },
        }),
    },
  ];

  const iconColor = isDark ? "white" : (themeColors.text as string);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: themeColors.text,
          marginBottom: 16,
        }}
      >
        What type of transfer?
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => {
              Haptics.selectionAsync();
              option.onPress(option.id);
            }}
            style={({ pressed }) => ({
              flexBasis: "48%",
              flexGrow: 1,
              backgroundColor: themeColors.card,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: cardBorderColor(isDark),
              paddingVertical: 20,
              paddingHorizontal: 12,
              alignItems: "center",
              gap: 8,
              opacity: pressed ? 0.7 : 1,
              position: "relative",
              overflow: "visible",
            })}
          >
            {option.badge && (
              <View
                style={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  backgroundColor: palette.info,
                  borderTopLeftRadius: radii.lg,
                  borderBottomRightRadius: radii.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 11, fontWeight: "600" }}
                >
                  {option.badge}
                </Text>
              </View>
            )}
            {option.renderIcon(iconColor)}
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: themeColors.text,
                textAlign: "center",
              }}
            >
              {option.title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: palette.muted,
                textAlign: "center",
              }}
            >
              {option.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() =>
          showAlert(
            "Which method should I use?",
            [
              "ACH transfer — sends money to a U.S. bank account.",
              "Mailed check — sends a physical check (U.S. only).",
              "Wise — sends money internationally, usually the cheapest option.",
              "Wire transfer — sends money internationally; use when Wise doesn't support the destination.",
              "HCB transfer — moves money to another HCB organization.",
              "Card grant — lets someone spend directly from a virtual card.",
            ].join("\n\n"),
          )
        }
        style={{ alignItems: "center", marginTop: 24 }}
      >
        <Text style={{ color: palette.muted, fontSize: 14 }}>
          Which method should I use?{" "}
          <Text style={{ color: themeColors.text, fontWeight: "700" }}>
            Help me decide →
          </Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}
