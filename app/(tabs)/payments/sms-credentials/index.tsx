import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { EXTRACT_SMS_TO_BUFFER } from '@/graphql/properties/mutations/sms';
import { SMS_CREDENTIALS_QUERY } from '@/graphql/properties/queries/sms';
import { useDeviceId } from '@/hooks/useDeviceId';
import { SmsReaderConfig, useSmsReader } from '@/hooks/useSmsReader';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SmsCredential {
  id: string;
  name: string;
  messageKeyword: string | null;
  expectedSender: string | null;
  referenceKeyword: string | null;
  externalReferenceKeyword: string | null;
  amountKeyword: string | null;
  readerConfig: string;
  deviceIdentifier: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastMessageAt: string | null;
  syncError: string | null;
  paymentMode: { id: string; name: string } | null;
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return 'Never';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d;
  }
}

function parseReaderConfig(raw: string): SmsReaderConfig {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      autoRead: Boolean(parsed?.autoRead),
      intervalMinutes: Number(parsed?.intervalMinutes) || 15,
    };
  } catch {
    return { autoRead: false, intervalMinutes: 15 };
  }
}

function CredentialCard({
  item,
  isThisDevice,
  onEdit,
  onReadNow,
  reading,
}: {
  item: SmsCredential;
  isThisDevice: boolean;
  onEdit: (item: SmsCredential) => void;
  onReadNow: (item: SmsCredential) => void;
  reading: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const config = parseReaderConfig(item.readerConfig);
  const senderLabel = item.expectedSender ?? '—';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEdit(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: (item.isActive ? Colors.success : colors.textMuted) + '18' }]}>
          <Ionicons name="phone-portrait-outline" size={20} color={item.isActive ? Colors.success : colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.credName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.credSender} numberOfLines={1}>
            <Text style={styles.mutedLabel}>Sender: </Text>{senderLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {isThisDevice && (
            <View style={[styles.badge, styles.badgeDevice]}>
              <Ionicons name="phone-portrait-outline" size={10} color={Colors.info} />
              <Text style={[styles.badgeText, { color: Colors.info }]}>This device</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.paymentMode ? (
          <View style={styles.metaItem}>
            <Ionicons name="card-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.paymentMode.name}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Ionicons name="refresh-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {config.autoRead ? `Auto · every ${config.intervalMinutes}m` : 'Manual only'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>Last sync: {formatDateTime(item.lastSyncedAt)}</Text>
        </View>
      </View>

      {item.syncError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={styles.errorText} numberOfLines={2}>{item.syncError}</Text>
        </View>
      ) : null}

      {isThisDevice && item.isActive && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.readBtn, reading && styles.readBtnDisabled]}
            onPress={() => onReadNow(item)}
            disabled={reading}
            activeOpacity={0.8}
          >
            {reading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sync-outline" size={14} color="#fff" />
            )}
            <Text style={styles.readBtnText}>{reading ? 'Reading…' : 'Read SMS Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CredentialCardWithReader({
  item,
  isThisDevice,
  onEdit,
}: {
  item: SmsCredential;
  isThisDevice: boolean;
  onEdit: (item: SmsCredential) => void;
}) {
  const config = parseReaderConfig(item.readerConfig);
  const [extractBuffer] = useMutation(EXTRACT_SMS_TO_BUFFER);

  const { triggerRead, reading } = useSmsReader({
    credential: isThisDevice ? item : null,
    readerConfig: config,
    onMessagesSubmitted: async (count) => {
      Alert.alert('SMS Read', `${count} message(s) submitted for processing.`);
    },
  });

  const handleReadNow = useCallback(async (cred: SmsCredential) => {
    // Try device read first; fallback to re-extracting any buffered logs
    await triggerRead();
    try {
      const res = await extractBuffer({ variables: { id: cred.id } });
      const result = res.data?.extractSmsReceiptToGatewayBuffer;
      if (result?.success && result.gatewayBufferId) {
        Alert.alert('Processed', result.message ?? 'SMS receipt processed into payment gateway buffer.');
      }
    } catch {
      // silent — extraction is best-effort
    }
  }, [triggerRead, extractBuffer]);

  return (
    <CredentialCard
      item={item}
      isThisDevice={isThisDevice}
      onEdit={onEdit}
      onReadNow={handleReadNow}
      reading={reading}
    />
  );
}

export default function SmsCredentials() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { deviceId, ready: deviceReady } = useDeviceId();

  const { data, loading, error, refetch } = useQuery(SMS_CREDENTIALS_QUERY, {
    variables: { first: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const allCredentials: SmsCredential[] = useMemo(() => {
    return (data?.smsReceiptCredentials?.edges ?? []).map((e: any) => e.node);
  }, [data]);

  // Only show credentials belonging to this device (or with no device set)
  const credentials = useMemo(() => {
    if (!deviceReady) return [];
    return allCredentials.filter(
      (c) => !c.deviceIdentifier || c.deviceIdentifier === deviceId,
    );
  }, [allCredentials, deviceId, deviceReady]);

  const handleEdit = useCallback((item: SmsCredential) => {
    router.push({ pathname: '/(tabs)/payments/sms-credentials/add', params: { id: item.id } } as any);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="SMS Read Policies" showBack />

      {(loading && credentials.length === 0) || !deviceReady ? <LoadingState /> : null}

      {error && credentials.length === 0 ? (
        <ErrorState
          title="Failed to load SMS credentials"
          message={error.message}
          onRetry={() => refetch()}
        />
      ) : null}

      {!error && deviceReady && (
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CredentialCardWithReader
              item={item}
              isThisDevice={item.deviceIdentifier === deviceId}
              onEdit={handleEdit}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="phone-portrait-outline"
                title="No read policies"
                description="Tap + to create your first SMS read policy for this device."
              />
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/payments/sms-credentials/add' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: 100 },

    fab: {
      position: 'absolute',
      right: Spacing.lg,
      bottom: Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    credName: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    credSender: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      marginTop: 2,
    },
    mutedLabel: {
      color: c.textMuted,
    },

    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    badgeActive: { backgroundColor: Colors.success + '18' },
    badgeInactive: { backgroundColor: c.borderLight },
    badgeDevice: { backgroundColor: Colors.info + '18' },
    badgeText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold },
    badgeTextActive: { color: Colors.success },
    badgeTextInactive: { color: c.textMuted },

    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },

    errorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
      backgroundColor: Colors.error + '10',
      borderRadius: Radius.sm,
      padding: Spacing.xs,
      marginTop: Spacing.xs,
    },
    errorText: {
      fontSize: Typography.fontSizeXs,
      color: Colors.error,
      flex: 1,
    },

    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: Spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      marginTop: Spacing.xs,
    },
    readBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radius.sm,
    },
    readBtnDisabled: { opacity: 0.6 },
    readBtnText: {
      fontSize: 12,
      fontWeight: Typography.fontWeightSemibold,
      color: '#fff',
    },
  });
}
