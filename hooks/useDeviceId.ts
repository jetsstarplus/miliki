import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@app_device_id';

/**
 * Returns a stable, per-device identifier stored in AsyncStorage.
 * This is intentionally per-install so configs are not shared across
 * company users who share an account on different devices.
 */
export function useDeviceId(): { deviceId: string; ready: boolean } {
  const [deviceId, setDeviceId] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
          const rand = Math.random().toString(36).substring(2, 10);
          const ts = Date.now().toString(36);
          id = `${Platform.OS}-${ts}-${rand}`;
          await AsyncStorage.setItem(DEVICE_ID_KEY, id);
        }
        setDeviceId(id);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return { deviceId, ready };
}
