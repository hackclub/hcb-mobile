import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  Text as NativeText,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { registerToastHost, type ToastItem, type ToastType } from "@/lib/toast";
import { useIsDark } from "@/lib/useColorScheme";
import { palette, radii } from "@/styles/theme";

// Toasts live at the top: the bottom edge belongs to the tab bar, and a card
// floating over the tab labels was one of the things this replaced.
//
// This component is mounted at the ROOT layout, outside the navigation
// `ThemeProvider` and outside `GestureHandlerRootView`. Two consequences that
// are easy to regress:
//   1. Never use `@/components/Text` or `useTheme()` here — out here they
//      resolve to React Navigation's *default light* theme, which is what
//      painted the title near-black on a dark card. Colours below are explicit.
//   2. Gestures must use core `PanResponder`, not react-native-gesture-handler.
const MAX_VISIBLE = 3;
const SWIPE_DISMISS_DY = -28;

const ACCENT: Record<ToastType, string> = {
  success: palette.success,
  error: palette.primary,
  warning: palette.warning,
  info: palette.info,
  loading: palette.muted,
};

const ICON: Record<
  Exclude<ToastType, "loading">,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  success: "checkmark-circle",
  error: "close-circle",
  warning: "warning",
  info: "information-circle",
};

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

function ToastCard({
  item,
  onDismiss,
  reduceMotion,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
  reduceMotion: boolean;
}) {
  const isDark = useIsDark();
  const enter = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const iconPop = useRef(new Animated.Value(1)).current;
  const dismissed = useRef(false);

  const isLoading = item.type === "loading";
  const accent = ACCENT[item.type];

  // A loading toast must not look dismissable: dismissing it would imply you
  // can cancel the work behind it, which you can't.
  const interactive = !isLoading;

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(enter, {
      toValue: 0,
      duration: reduceMotion ? 0 : 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDismiss(item.id));
  }, [enter, item.id, onDismiss, reduceMotion]);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: reduceMotion ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, reduceMotion]);

  // Re-arm the dismiss timer on every update, so a loading→success transition
  // gets a full display window instead of inheriting the spinner's remainder.
  useEffect(() => {
    const timer = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timer);
  }, [dismiss, item.duration, item.revision]);

  // Pop the icon when the toast is updated — spinner → tick reads as resolution.
  const firstRevision = useRef(item.revision);
  useEffect(() => {
    if (item.revision === firstRevision.current || reduceMotion) return;
    iconPop.setValue(0.5);
    Animated.spring(iconPop, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [item.revision, item.type, iconPop, reduceMotion]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      item.message ? `${item.title}. ${item.message}` : item.title,
    );
  }, [item.title, item.message, item.revision]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          interactive && Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          // Upward freely; resist downward so the card feels anchored.
          drag.setValue(g.dy < 0 ? g.dy : g.dy * 0.15);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy < SWIPE_DISMISS_DY) {
            Animated.timing(drag, {
              toValue: -140,
              duration: reduceMotion ? 0 : 130,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(dismiss);
          } else {
            Animated.spring(drag, {
              toValue: 0,
              friction: 7,
              tension: 120,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [dismiss, drag, interactive, reduceMotion],
  );

  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }),
    drag,
  );

  const surface = isDark ? "#2A2930" : "#ffffff";
  const titleColor = isDark ? "#F2F4F7" : palette.black;
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";

  return (
    <Animated.View
      {...pan.panHandlers}
      style={{ opacity: enter, transform: [{ translateY }] }}
    >
      <Pressable
        onPress={interactive ? dismiss : undefined}
        accessibilityRole="alert"
        accessibilityLabel={
          item.message ? `${item.title}. ${item.message}` : item.title
        }
        accessibilityHint={
          interactive ? "Tap or swipe up to dismiss" : undefined
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: item.message ? "flex-start" : "center",
          gap: 11,
          backgroundColor: surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor,
          // Semantic colour as a left stripe, so type survives at a glance even
          // when the icon is missed.
          borderLeftWidth: 3,
          borderLeftColor: accent,
          paddingVertical: 12,
          paddingLeft: 13,
          paddingRight: 14,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.45 : 0.13,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: 7,
          opacity: pressed && interactive ? 0.88 : 1,
        })}
      >
        <Animated.View
          style={{
            width: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
            marginTop: item.message ? 1 : 0,
            transform: [{ scale: iconPop }],
          }}
        >
          {item.type === "loading" ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name={ICON[item.type]} size={20} color={accent} />
          )}
        </Animated.View>

        <View style={{ flex: 1, gap: 2 }}>
          <NativeText
            style={{ color: titleColor, fontSize: 15, fontWeight: "600" }}
          >
            {item.title}
          </NativeText>
          {item.message ? (
            <NativeText
              style={{ color: palette.muted, fontSize: 13, lineHeight: 18 }}
            >
              {item.message}
            </NativeText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return registerToastHost({
      onShow: (item) =>
        setToasts((current) => {
          const existing = current.findIndex((t) => t.id === item.id);
          // Update in place, keeping position, so a loading toast resolving to
          // success doesn't jump to the top of the stack.
          if (existing !== -1) {
            const next = [...current];
            next[existing] = item;
            return next;
          }
          const next = [item, ...current];
          if (next.length <= MAX_VISIBLE) return next;
          // Over cap: drop the oldest *settled* toast, never an in-flight
          // spinner, so progress can't be evicted by a burst of confirmations.
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].type !== "loading") {
              next.splice(i, 1);
              return next;
            }
          }
          return next.slice(0, MAX_VISIBLE);
        }),
      onDismiss: remove,
      onDismissAll: () => setToasts([]),
    });
  }, [remove]);

  if (!toasts.length) return null;

  return (
    <View
      // box-none: the container never swallows touches, only the cards do.
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 12,
        right: 12,
        gap: 8,
        zIndex: 9999,
      }}
    >
      {toasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={remove}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}
