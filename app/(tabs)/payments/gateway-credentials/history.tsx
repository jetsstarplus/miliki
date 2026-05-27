import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { GATEWAY_CREDENTIAL_CALLBACK_HISTORY_DATA } from '@/graphql/properties/queries/gateway-credentials';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CallbackItem = {
  id?: string;
  receivedAt?: string;
  reference?: string;
  status?: string;
  notes?: string;
  bufferId?: string;
  bufferReference?: string;
};

function normalizeGenericScalarPayload(value: any): any {
  if (!value) return {};

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  for (let i = 0; i < 3; i += 1) {
    if (!(parsed && typeof parsed === 'object' && 'data' in parsed)) break;
    const next = (parsed as any).data;
    if (typeof next === 'string') {
      try {
        parsed = JSON.parse(next);
      } catch {
        break;
      }
    } else if (next && typeof next === 'object') {
      parsed = next;
    } else {
      break;
    }
  }

  return parsed;
}

function formatDateTime(raw?: string) {
  if (!raw) return '-';
  try {
    return new Date(raw).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export default function GatewayCredentialCallbackHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goToGatewayCredentialsList = () => router.push('/(tabs)/payments/gateway-credentials' as any);

  const { data, loading, error, refetch } = useQuery(GATEWAY_CREDENTIAL_CALLBACK_HISTORY_DATA, {
    variables: { credentialId: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });

  const payload = normalizeGenericScalarPayload((data as any)?.gatewayCredentialCallbackHistoryData ?? {});
  const items: CallbackItem[] = Array.isArray(payload?.items) ? payload.items : [];

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Callback History" showBack onBack={goToGatewayCredentialsList} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Callback History" showBack onBack={goToGatewayCredentialsList} />
        <ErrorState title="Failed to load callback history" message={error.message} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={String(payload?.title ?? 'Callback History')} showBack onBack={goToGatewayCredentialsList} />

      <FlatList
        data={items}
        keyExtractor={(item, idx) => String(item?.id ?? `cb-${idx}`)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="No callbacks yet" description="No callback entries were found for this credential." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowHead}>
              <Text style={styles.status}>{item.status ?? 'UNKNOWN'}</Text>
              <Text style={styles.receivedAt}>{formatDateTime(item.receivedAt)}</Text>
            </View>
            <Text style={styles.meta}>Reference: {item.reference ?? '-'}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            {item.bufferId || item.bufferReference ? (
              <TouchableOpacity
                style={styles.bufferRow}
                onPress={() => {
                  if (!item.bufferId) return;
                  router.push({ pathname: '/(tabs)/payments/unmatched/[id]', params: { id: item.bufferId } } as any);
                }}
                activeOpacity={0.8}
                disabled={!item.bufferId}
              >
                <Ionicons name="layers-outline" size={14} color={colors.primary} />
                <Text style={styles.bufferText}>Buffer: {item.bufferReference ?? item.bufferId}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    rowHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    status: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    receivedAt: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
    meta: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 4,
    },
    notes: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: 6,
    },
    bufferRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    bufferText: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
    },
  });
}
