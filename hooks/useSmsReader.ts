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

export interface ReadDiagnostic {
  moduleLoaded: boolean;
  totalInbox: number;
  afterSenderFilter: number;
  senderFilter: string | null;
  afterKeywordFilter: number;
  keywordFilter: string | null;
  submitted: number;
  syncFrom: string;
  error: string | null;
}

interface UseSmsReaderParams {
  credential: {
    id: string;
    messageKeyword?: string | null;
    expectedSender?: string | null;
    referenceKeyword?: string | null;
  } | null;
  readerConfig: SmsReaderConfig;
  lastSyncedAt?: string | null;
  onMessagesSubmitted?: (count: number) => void;
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function defaultSyncFrom(lastSyncedAt: string | null | undefined): Date {
  if (lastSyncedAt) {
    try {
      const d = new Date(lastSyncedAt);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fall through */ }
  }
  return new Date(Date.now() - ONE_MONTH_MS);
}

/**
 * Handles SMS reading on Android and posting messages to the server.
 *
 * SMS reading requires the `react-native-get-sms-android` package:
 *   expo install react-native-get-sms-android
 *
 * On iOS, SMS reading is not available and this hook is a no-op.
 */
export function useSmsReader({ credential, readerConfig, lastSyncedAt, onMessagesSubmitted }: UseSmsReaderParams) {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [reading, setReading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDiagnostic, setLastDiagnostic] = useState<ReadDiagnostic | null>(null);
  const [syncFromDate, setSyncFromDate] = useState<Date>(() => defaultSyncFrom(lastSyncedAt));
  const prevCredentialId = useRef<string | null | undefined>(credential?.id);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const apolloClient = useApolloClient();

  // When the credential changes, reset syncFromDate to lastSyncedAt (or 1 month ago)
  useEffect(() => {
    if (prevCredentialId.current !== credential?.id) {
      prevCredentialId.current = credential?.id;
      setSyncFromDate(defaultSyncFrom(lastSyncedAt));
    }
  }, [credential?.id, lastSyncedAt]);

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
   * Returns filtered messages and a diagnostic breakdown of each filter stage.
   */
  const readMessages = useCallback((): Promise<{ messages: SmsMessage[]; diagnostic: ReadDiagnostic }> => {
    const senderFilter = credential?.expectedSender?.trim() || null;
    const msgKeyword = credential?.messageKeyword?.trim().toLowerCase() || null;
    const moduleLoaded = isSupported && SmsAndroid != null && typeof SmsAndroid?.list === 'function';
    const syncFrom = syncFromDate.toISOString();

    const emptyDiag = (error: string | null): ReadDiagnostic => ({
      moduleLoaded,
      totalInbox: 0,
      afterSenderFilter: 0,
      senderFilter,
      afterKeywordFilter: 0,
      keywordFilter: msgKeyword,
      submitted: 0,
      syncFrom,
      error,
    });

    return new Promise((resolve) => {
      if (!moduleLoaded) {
        resolve({ messages: [], diagnostic: emptyDiag(!isSupported ? 'Platform not supported' : 'SMS module not loaded or missing list()') });
        return;
      }

      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          minDate: syncFromDate.getTime(),
          indexFrom: 0,
          maxCount: 500,
        }),
        (error: any) => {
          const errMsg = String(error);
          setLastError(errMsg);
          resolve({ messages: [], diagnostic: emptyDiag(errMsg) });
        },
        (_count: number, smsList: string) => {
          try {
            const allMessages: SmsMessage[] = JSON.parse(smsList);
            const totalInbox = allMessages.length;

            const afterSender = senderFilter
              ? allMessages.filter((m) =>
                  m.address?.toLowerCase().includes(senderFilter.toLowerCase()),
                )
              : allMessages;

            const afterKeyword = msgKeyword
              ? afterSender.filter((m) => m.body?.toLowerCase().includes(msgKeyword))
              : afterSender;

            resolve({
              messages: afterKeyword,
              diagnostic: {
                moduleLoaded,
                totalInbox,
                afterSenderFilter: afterSender.length,
                senderFilter,
                afterKeywordFilter: afterKeyword.length,
                keywordFilter: msgKeyword,
                submitted: 0, // updated after sync
                syncFrom,
                error: null,
              },
            });
          } catch (e: any) {
            resolve({ messages: [], diagnostic: emptyDiag(`Parse error: ${e?.message}`) });
          }
        },
      );
    });
  }, [isSupported, SmsAndroid, credential, syncFromDate]);

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
      const { messages, diagnostic } = await readMessages();

      if (diagnostic.error) {
        setLastDiagnostic(diagnostic);
        if (isManual) Alert.alert('SMS Read Error', diagnostic.error);
        return;
      }

      let submitted = 0;
      if (messages.length > 0) {
        const ok = await syncMessages(messages, isManual);
        if (ok) {
          submitted = messages.length;
          onMessagesSubmitted?.(messages.length);
        }
      }

      const finalDiagnostic: ReadDiagnostic = { ...diagnostic, submitted };
      setLastDiagnostic(finalDiagnostic);
      setLastReadAt(new Date());

      if (isManual) {
        const lines: string[] = [
          `� Reading from: ${new Date(finalDiagnostic.syncFrom).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          `📥 Inbox total: ${finalDiagnostic.totalInbox} message${finalDiagnostic.totalInbox !== 1 ? 's' : ''}`,
        ];
        if (finalDiagnostic.senderFilter) {
          lines.push(`👤 After sender "${finalDiagnostic.senderFilter}": ${finalDiagnostic.afterSenderFilter}`);
        } else {
          lines.push(`👤 Sender filter: none (all senders)`);
        }
        if (finalDiagnostic.keywordFilter) {
          lines.push(`🔑 After keyword "${finalDiagnostic.keywordFilter}": ${finalDiagnostic.afterKeywordFilter}`);
        } else {
          lines.push(`🔑 Keyword filter: none (all messages)`);
        }
        lines.push(`✅ Submitted to server: ${finalDiagnostic.submitted}`);

        const title = finalDiagnostic.submitted > 0 ? 'SMS Read Complete' : 'No Matching Messages';
        Alert.alert(title, lines.join('\n'));
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
    lastDiagnostic,
    syncFromDate,
    setSyncFromDate,
    requestPermission,
    triggerRead,
    simulateAndSync: __DEV__ ? simulateAndSync : undefined,
  };
}
