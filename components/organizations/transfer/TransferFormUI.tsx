import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router/react-navigation";
import { ReactNode, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import Button from "@/components/Button";
import { Text } from "@/components/Text";
import { useIsDark } from "@/lib/useColorScheme";
import { cardBorderColor, palette, radii } from "@/styles/theme";

// Shared look for the primary "Send …" button across every transfer form:
// a light-blue fill with dark navy label/icon.
const TRANSFER_SUBMIT_BG = "#74B2E6";
const TRANSFER_SUBMIT_BORDER = "#8FBEE8";
const TRANSFER_SUBMIT_FG = "#12283F";

/* -------------------------------------------------------------------------- */
/*  Section — a plain bold title above a card that groups its fields.          */
/* -------------------------------------------------------------------------- */

export function FormSection({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View style={style}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          padding: 16,
          gap: 16,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field — label, optional description, and an inset input box.               */
/* -------------------------------------------------------------------------- */

type FormFieldProps = TextInputProps & {
  label: string;
  description?: string;
  optional?: boolean;
  prefix?: string;
};

export function FormField({
  label,
  description,
  optional,
  prefix,
  style,
  ...inputProps
}: FormFieldProps) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: themeColors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: focused ? themeColors.primary : cardBorderColor(isDark),
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        {prefix ? (
          <Text
            style={{ color: palette.muted, fontSize: 16, fontWeight: "500" }}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={palette.muted}
          style={[
            { color: themeColors.text, fontSize: 16, flex: 1, padding: 0 },
            style,
          ]}
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Select field — looks like FormField but opens a picker on tap.             */
/* -------------------------------------------------------------------------- */

export function SelectField({
  label,
  description,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  description?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: themeColors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          paddingHorizontal: 14,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            color: value ? themeColors.text : palette.muted,
            fontSize: 16,
          }}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.muted} />
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Toggle field — label/description on the left, a Switch on the right.        */
/* -------------------------------------------------------------------------- */

export function ToggleField({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Attach field — label/description on the left, an attach button on the      */
/*  right; once a file is picked it shows the filename with a remove button.    */
/* -------------------------------------------------------------------------- */

export function AttachField({
  label,
  description,
  fileName,
  onPress,
  onClear,
}: {
  label: string;
  description?: string;
  fileName?: string;
  onPress: () => void;
  onClear: () => void;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.label, { color: themeColors.text }]}>
            {label}
          </Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: themeColors.background,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: cardBorderColor(isDark),
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={themeColors.text}
          />
          <Text
            style={{ color: themeColors.text, fontSize: 15, fontWeight: "600" }}
          >
            Attach file
          </Text>
        </Pressable>
      </View>
      {fileName ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: themeColors.background,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: cardBorderColor(isDark),
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Ionicons name="document-outline" size={18} color={palette.muted} />
          <Text
            numberOfLines={1}
            style={{ color: themeColors.text, fontSize: 14, flex: 1 }}
          >
            {fileName}
          </Text>
          <Pressable onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={palette.muted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Read-only field — a non-editable value box (used for "From").              */
/* -------------------------------------------------------------------------- */

export function ReadOnlyField({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: themeColors.background,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: cardBorderColor(isDark),
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 16 }}>{value}</Text>
        {secondary ? (
          <Text style={{ color: palette.muted, fontSize: 15 }}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Info callout — tinted box with icon, title and bullet points.             */
/* -------------------------------------------------------------------------- */

export function InfoCallout({
  title,
  points,
  color = palette.info,
  icon = "information-circle",
}: {
  title: string;
  points: ReactNode[];
  color?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View
      style={{
        backgroundColor: color + "14",
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: color + "40",
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={{ color, fontSize: 15, fontWeight: "700" }}>{title}</Text>
      </View>
      <View style={{ gap: 6 }}>
        {points.map((point, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ color, fontSize: 14, lineHeight: 20 }}>•</Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: 14,
                lineHeight: 20,
                flex: 1,
              }}
            >
              {point}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Notice callout — card with a colored title, a paragraph body, and an       */
/*  optional muted footer section (e.g. "this requirement is waived …").        */
/* -------------------------------------------------------------------------- */

export function NoticeCallout({
  title,
  children,
  footer,
  color = palette.info,
  icon = "information-circle-outline",
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  color?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors: themeColors } = useTheme();
  const isDark = useIsDark();

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: cardBorderColor(isDark),
        backgroundColor: themeColors.card,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={icon} size={20} color={color} />
          <Text style={{ color, fontSize: 17, fontWeight: "700" }}>
            {title}
          </Text>
        </View>
        <Text style={{ color: themeColors.text, fontSize: 15, lineHeight: 22 }}>
          {children}
        </Text>
      </View>
      {footer ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: cardBorderColor(isDark),
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
          }}
        >
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21 }}>
            {footer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Submit button — the shared "Send …" button for every transfer form.        */
/* -------------------------------------------------------------------------- */

export function TransferSubmitButton({
  loading,
  disabled,
  onPress,
  children,
  icon = "send",
}: {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: string;
  icon?: React.ComponentProps<typeof Button>["icon"];
}) {
  return (
    <Button
      variant="blue"
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      icon={icon}
      iconPosition="right"
      iconSize={24}
      color={TRANSFER_SUBMIT_FG}
      iconColor={TRANSFER_SUBMIT_FG}
      style={{
        backgroundColor: TRANSFER_SUBMIT_BG,
        borderColor: TRANSFER_SUBMIT_BORDER,
      }}
    >
      {children}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer reassurance note under the submit button.                          */
/* -------------------------------------------------------------------------- */

export function FooterNote({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: palette.muted,
        fontSize: 13,
        textAlign: "center",
        marginBottom: 24,
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  optional: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.muted,
  },
  description: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
