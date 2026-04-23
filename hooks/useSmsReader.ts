import { SYNC_SMS_RECEIPT_MESSAGES_SUMMARY } from '@/graphql/properties/mutations/sms';
import { useApolloClient } from '@apollo/client';
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
    messageKeyword?: string | null;
    expectedSender?: string | null;
    referenceKeyword?: string | null;
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
  const apolloClient = useApolloClient();

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

      const senderFilter = credential?.expectedSender ?? null;

      const msgKeyword = credential?.messageKeyword?.toLowerCase() ?? null;

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
            const filtered = senderFilter
              ? messages.filter((m) =>
                  m.address?.toLowerCase().includes(senderFilter.toLowerCase()),
                )
              : messages;
            // Only keep messages whose body contains the message keyword (qualifier)
            const keywordFiltered = msgKeyword
              ? filtered.filter((m) => m.body?.toLowerCase().includes(msgKeyword))
              : filtered;
            resolve(keywordFiltered);
          } catch {
            resolve([]);
          }
        },
      );
    });
  }, [isSupported, SmsAndroid, credential]);

  /**
   * Sync messages to the server via the GraphQL syncSmsReceiptMessagesSummary mutation.
   * On manual sync (isManual=true) errors are shown as an Alert.
   */
  const syncMessages = useCallback(
    async (messages: SmsMessage[], isManual: boolean): Promise<boolean> => {
      if (!credential || messages.length === 0) return true;
      try {
        const clientMutationId = `sync-${Date.now()}`;
        const { data, errors } = await apolloClient.mutate({
          mutation: SYNC_SMS_RECEIPT_MESSAGES_SUMMARY,
          variables: {
            input: {
              credentialId: credential.id,
              deduplicateByProviderMessageId: true,
              messages: messages.map((m) => ({
                providerMessageId: String(m.id),
                sender: m.address,
                senderPhone: m.address,
                messageBody: m.body,
                messageDate: new Date(m.date).toISOString(),
                syncedAt: new Date().toISOString(),
              })),
              clientMutationId,
            },
          },
        });
        if (errors?.length) {
          const msg = errors[0].message;
          setLastError(msg);
          if (isManual) Alert.alert('Sync Failed', msg);
          return false;
        }
        const result = data?.syncSmsReceiptMessagesSummary;
        if (!result?.success) {
          const msg = result?.message ?? 'Sync failed.';
          setLastError(msg);
          if (isManual) Alert.alert('Sync Failed', msg);
          return false;
        }
        if (result.lastSyncedAt) setLastReadAt(new Date(result.lastSyncedAt));
        return true;
      } catch (e: any) {
        const msg = e?.message ?? 'Failed to sync SMS messages';
        setLastError(msg);
        if (isManual) Alert.alert('Sync Error', msg);
        return false;
      }
    },
    [apolloClient, credential],
  );

  /**
   * DEV ONLY — generate realistic-looking payment SMS messages and sync them
   * via the GraphQL mutation without touching the device inbox.
   */
  const simulateAndSync = useCallback(async () => {
    if (!__DEV__) return;
    if (!credential) {
      Alert.alert('No credential', 'Save the policy first, then simulate.');
      return;
    }
    const sender = credential.expectedSender ?? 'MPESA';
    const names = ['VICTOR OTIENO', 'JANE MWANGI', 'PETER OTIENO', 'GRACE WANJIKU'];
    const refs = ['APT-1A', 'APT-2B', 'UNIT-3C', 'SHOP-4D'];
    const amounts = ['1500.00', '3200.00', '750.00', '5000.00'];
    let receipts = ['QJD8K2L9', 'MNP4R7X1', 'BVT9S2W3', 'KCL6H0Y5', 'MNP4R7X1'];

    // 1. Create a unique array from the original
    // 2. Shuffle using Fisher-Yates
    const finalizeReceipts = (arr: string[]): string[] => {
      let unique = [...new Set(arr)];
      for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
      }
      return unique;
    };

    // Reassign the variable to the final randomized, unique result
    receipts = finalizeReceipts(receipts);
    const now = Date.now();
    const msgKeyword = credential.messageKeyword ?? 'Confirmed';
    const refKeyword = credential.referenceKeyword ?? 'account';
    const fakeMessages: SmsMessage[] = Array.from({ length: 3 }, (_, i) => {
      const name = names[i % names.length];
      const ref = refs[i % refs.length];
      const amount = amounts[i % amounts.length];
      const receipt = receipts[i % receipts.length];
      return {
        id: `sim-${now}-${i}`,
        address: sender,
        body: `${receipt} ${msgKeyword}. KES ${amount} received from ${name} 0701850242. ${refKeyword} ${ref}.`,
        date: now - i * 60_000,
        dateSent: now - i * 60_000,
      };
    });
    setReading(true);
    setLastError(null);
    try {
      const ok = await syncMessages(fakeMessages, true);
      if (ok) {
        Alert.alert(
          'Simulation Complete',
          `${fakeMessages.length} simulated message(s) synced successfully.`,
        );
        onMessagesSubmitted?.(fakeMessages.length);
      }
    } finally {
      setReading(false);
    }
  }, [credential, syncMessages, onMessagesSubmitted]);

  /**
   * Trigger a full read-and-sync cycle.
   * Pass isManual=false when called from the auto-poll timer to suppress Alert dialogs.
   */
  const triggerRead = useCallback(async (isManual = true) => {
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
      const ok = await syncMessages(messages, isManual);
      if (ok) {
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
    syncMessages,
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
        triggerRead(false); // auto-poll: suppress alert dialogs
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
    simulateAndSync: __DEV__ ? simulateAndSync : undefined,
  };
}
