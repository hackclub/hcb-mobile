import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export default function useSkeletonAnimation() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [anim]);

  const background = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0, 0, 0, 0.03)", "rgba(0, 0, 0, 0.12)"],
  });

  return function createSkeletonStyle(
    width: number,
    height: number,
    extraStyles: Record<string, unknown> = {},
  ) {
    return {
      width,
      height,
      backgroundColor: background,
      borderRadius: 8,
      overflow: "hidden" as const,
      ...extraStyles,
    };
  };
}
