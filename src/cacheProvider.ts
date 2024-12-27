import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

export default function asyncStorageProvider() {
  const map = new Map();
  // Initialize the map with data from AsyncStorage
  (async () => {
    try {
      const appCache = await AsyncStorage.getItem('app-cache');
      if (appCache) {
        JSON.parse(appCache).forEach(([key, value]) => {
          map.set(key, value);
        });
      }
    } catch (error) {
      console.error('Error initializing asyncStorageProvider:', error);
    }
  })();
  // Save the map to AsyncStorage before the app goes to the background
  const saveAppCache = async () => {
    try {
      const appCache = JSON.stringify(Array.from(map.entries()));
      await AsyncStorage.setItem('app-cache', appCache);
    } catch (error) {
      console.error('Error saving asyncStorageProvider cache:', error);
    }
  };
  AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      saveAppCache();
    }
  });
  return map;
}