import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useCallback } from "react";

const SHAKE_THRESHOLD = 1.8;
const SHAKE_COUNT_THRESHOLD = 3;
const SHAKE_TIME_WINDOW = 1500;
const COOLDOWN_TIME = 500;

export function useShakeDetector(onShake: () => void, enabled: boolean = true) {
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeTime = useRef<number>(0);
  const subscription = useRef<ReturnType<
    typeof Accelerometer.addListener
  > | null>(null);

  const handleAccelerometerData = useCallback(
    ({ x, y, z }: { x: number; y: number; z: number }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (
        acceleration > SHAKE_THRESHOLD &&
        now - lastShakeTime.current > COOLDOWN_TIME
      ) {
        lastShakeTime.current = now;
        shakeTimestamps.current.push(now);

        shakeTimestamps.current = shakeTimestamps.current.filter(
          (timestamp) => now - timestamp < SHAKE_TIME_WINDOW,
        );

        if (shakeTimestamps.current.length >= SHAKE_COUNT_THRESHOLD) {
          shakeTimestamps.current = [];
          onShake();
        }
      }
    },
    [onShake],
  );

  useEffect(() => {
    if (!enabled) {
      subscription.current?.remove();
      subscription.current = null;
      return;
    }

    Accelerometer.setUpdateInterval(100);
    subscription.current = Accelerometer.addListener(handleAccelerometerData);

    return () => {
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [enabled, handleAccelerometerData]);
}
