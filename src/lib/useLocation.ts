import Geolocation, {
  GeolocationError,
  GeolocationResponse,
} from "@react-native-community/geolocation";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import { logError } from "./errorUtils";

export function useLocation() {
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [location, setLocation] = useState<{
    latitude: string;
    longitude: string;
  } | null>(null);

  async function requestLocationPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Localização",
          message: "Permitir que o aplicativo utilize a sua localização.",
          buttonPositive: "OK",
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      logError("Location permission error", err, { context: { platform: Platform.OS } });
      return false; // Return false when permission request fails
    }
  }

  const getAndroidLocation = useCallback(async () => {
    const granted = await requestLocationPermission();

    if (!granted) {
      setAccessDenied(true);
      return;
    }

    Geolocation.getCurrentPosition(
      (position: GeolocationResponse) => {
        const coordinates = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        };

        setLocation(coordinates);
      },
      (error: GeolocationError) => {
        logError("Error getting location", error, { context: { action: "get_location" } });
      },
      { enableHighAccuracy: true },
    );
  }, []);

  const getIosLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setAccessDenied(true);
        return;
      }
      const location = await Location.getCurrentPositionAsync();

      const coordinates = {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      };

      setLocation(coordinates);
    } catch (error) {
      logError("Error getting iOS location", error, { context: { action: "get_ios_location" } });
      setAccessDenied(true); // Set access denied on error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const getLocation = async () => {
        if (Platform.OS === "android") {
          await getAndroidLocation();
          return;
        }

        await getIosLocation();
      };

      getLocation().catch((err) => {
        logError("Location access error", err, { context: { platform: Platform.OS } });
      });
    }, [getAndroidLocation, getIosLocation]),
  );

  return {
    accessDenied,
    location,
  };
}
