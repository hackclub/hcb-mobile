import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showOfflineAlert = () => {
    Toast.show({
      type: ALERT_TYPE.WARNING,
      title: 'Offline Mode',
      textBody: 'This action requires an internet connection.',
    });
  };

  const withOfflineCheck = <T extends (...args: any[]) => any>(
    action: T,
    showAlert = true
  ): T => {
    return ((...args: Parameters<T>) => {
      if (!isOnline) {
        if (showAlert) {
          showOfflineAlert();
        }
        return;
      }
      return action(...args);
    }) as T;
  };

  return {
    isOnline,
    showOfflineAlert,
    withOfflineCheck,
  };
} 