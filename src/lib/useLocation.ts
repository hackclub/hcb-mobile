import { useCallback, useState } from 'react'
import * as Location from 'expo-location'
import { useFocusEffect } from '@react-navigation/native'
import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from '@react-native-community/geolocation'

export function useLocation() {
  const [accessDenied, setAccessDenied] = useState<boolean>(false)
  const [location, setLocation] = useState<any | null>(null)

  async function requestLocationPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Localização',
          message: 'Permitir que o aplicativo utilize a sua localização.',
          buttonPositive: 'OK',
        }
      )

      return granted === PermissionsAndroid.RESULTS.GRANTED
    } catch (err) {
      console.error(err)
    }
  }

  const getAndroidLocation = useCallback(async () => {
    const granted = await requestLocationPermission()

    if (!granted) {
      setAccessDenied(true)
      return
    }

    Geolocation.getCurrentPosition(
      (position: any) => {
        const coordinates = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }

        setLocation(coordinates)
      },
      (error: any) => {
        console.error('Error getting location:', error)
      },
      { enableHighAccuracy: true }
    )
  }, [])

  const getIosLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== 'granted') {
      setAccessDenied(true)
      return
    }
    const location = await Location.getCurrentPositionAsync()

    const coordinates = {
      latitude: location.coords.latitude.toString(),
      longitude: location.coords.longitude.toString(),
    }

    setLocation(coordinates)
  }, [])

  useFocusEffect(
    useCallback(() => {
      const getLocation = async () => {
        if (Platform.OS === 'android') {
          await getAndroidLocation()
          return
        }

        await getIosLocation()
      }

      getLocation().catch((err) => {
        console.error(err)
      })
    }, [getAndroidLocation, getIosLocation])
  )

  return {
    accessDenied,
    location,
  }
}