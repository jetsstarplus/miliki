import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

// Direct require so the native module is resolved properly after a native build.
// Wrapped in try/catch so it degrades gracefully in Expo Go or on iOS.
let _SmsAndroid: any = null;
if (Platform.OS === 'android') {
  try {
    _SmsAndroid = require('react-native-get-sms-android');
    // The package may export via `.default` (ESM interop) or directly
    if (_SmsAndroid?.default) _SmsAndroid = _SmsAndroid.default;
  } catch {
    _SmsAndroid = null;
  }
}

export interface SmsMessage {
  id: string;
  address: string;  // sender phone / ID
  body: string;
  date: number;     // Unix timestamp ms
  dateSent: number;
}

export interface SmsReaderConfig {
  autoRead: boolean;
  intervalMinutes: number;
}

interface UseSmsReaderParams {
  credential: {
    id: string;
    syncEndpoint?: string | null;
    expectedSender?: string | null;
    sourceShortcode?: string | null;
    sourcePhoneNumber?: string | null;
  } | null;
  readerConfig: SmsReaderConfig;
  onMessagesSubmitted?: (count: number) => void;
}

/**
 * Handles SMS reading on Android and posting messages to the server.
 *
 * SMS reading requires the `react-native-get-sms-android` package:
 *   expo install react-native-get-sms-android
 *
 * On iOS, SMS reading is not available and this hook is a no-op.
 */
export function useSmsReader({ credential, readerConfig, onMessagesSubmitted }: UseSmsReaderParams) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [reading, setReading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // SmsAndroid from react-native-get-sms-android
  const SmsAndroid = _SmsAndroid;
  const isSupported = Platform.OS === 'android' && SmsAndroid != null;
  const isIOS = Platform.OS === 'ios';

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setPermissionGranted(false);
      return false;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Read Permission',
          message:
            'This app needs to read SMS messages to automatically detect and process payment receipts according to your configured policies.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setPermissionGranted(granted);
      return granted;
    } catch {
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissionGranted(false);
      return;
    }
    const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    setPermissionGranted(result);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  /**
   * Read SMS messages from the device inbox and filter by the credential's sender rules.
   * Returns filtered messages or null on error.
   */
  const readMessages = useCallback((): Promise<SmsMessage[]> => {
    return new Promise((resolve) => {
      if (!isSupported || !SmsAndroid) {
        resolve([]);
        return;
      }

      const senderFilters = [
        credential?.expectedSender,
        credential?.sourceShortcode,
        credential?.sourcePhoneNumber,
      ].filter(Boolean) as string[];

      // Read inbox messages from the last 24 hours
      const since = Date.now() - 24 * 60 * 60 * 1000;

      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          minDate: since,
          indexFrom: 0,
          maxCount: 200,
        }),
        (error: any) => {
          setLastError(String(error));
          resolve([]);
        },
        (_count: number, smsList: string) => {
          try {
            const messages: SmsMessage[] = JSON.parse(smsList);
            const filtered =
              senderFilters.length > 0
                ? messages.filter((m) =>
                    senderFilters.some((f) =>
                      m.address?.toLowerCase().includes(f.toLowerCase()),
                    ),
                  )
                : messages;
            resolve(filtered);
          } catch {
            resolve([]);
          }
        },
      );
    });
  }, [isSupported, SmsAndroid, credential]);

  /**
   * Post messages to the credential's syncEndpoint.
   */
  const postToEndpoint = useCallback(
    async (messages: SmsMessage[]): Promise<boolean> => {
      if (!credential?.syncEndpoint || messages.length === 0) return true;
      try {
        const response = await fetch(credential.syncEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentialId: credential.id,
            messages: messages.map((m) => ({
              providerMessageId: String(m.id),
              sender: m.address,
              messageBody: m.body,
              messageDate: new Date(m.date).toISOString(),
            })),
          }),
        });
        return response.ok;
      } catch (e: any) {
        setLastError(e?.message ?? 'Failed to post to endpoint');
        return false;
      }
    },
    [credential],
  );

  /**
   * Trigger a full read-and-post cycle.
   */
  const triggerRead = useCallback(async () => {
    if (!credential) return;
    if (isIOS) {
      Alert.alert(
        'Not Available',
        'SMS reading is not available on iOS. Messages must be submitted to the server via the sync endpoint on an Android device.',
      );
      return;
    }
    if (!isSupported) {
      Alert.alert(
        'Module Not Installed',
        'SMS reading requires the react-native-get-sms-android package.\n\nRun: npx expo install react-native-get-sms-android',
      );
      return;
    }
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'SMS read permission is required to read messages.');
        return;
      }
    }
    setReading(true);
    setLastError(null);
    try {
      const messages = await readMessages();
      if (messages.length === 0) {
        setLastReadAt(new Date());
        return;
      }
      const ok = await postToEndpoint(messages);
      if (ok) {
        setLastReadAt(new Date());
        onMessagesSubmitted?.(messages.length);
      }
    } finally {
      setReading(false);
    }
  }, [
    credential,
    isIOS,
    isSupported,
    permissionGranted,
    requestPermission,
    readMessages,
    postToEndpoint,
    onMessagesSubmitted,
  ]);

  // Set up auto-polling
  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (readerConfig.autoRead && readerConfig.intervalMinutes > 0 && credential) {
      const ms = readerConfig.intervalMinutes * 60 * 1000;
      pollTimer.current = setInterval(() => {
        triggerRead();
      }, ms);
    }
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [readerConfig.autoRead, readerConfig.intervalMinutes, credential, triggerRead]);

  return {
    isSupported,
    isIOS,
    permissionGranted,
    reading,
    lastReadAt,
    lastError,
    requestPermission,
    triggerRead,
  };
}
