import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { RE_EXTRACT_PENDING_SMS_RECEIPTS } from '@/graphql/properties/mutations/sms';
import { SMS_MESSAGE_LOGS_QUERY } from '@/graphql/properties/queries/sms';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

type ExtractionStatus = 'PENDING' | 'BUFFERED' | 'IGNORED' | 'FAILED';

interface MessageLog {
  id: string;
  sender: string | null;
  senderPhone: string | null;
  messageBody: string;
  messageDate: string;
  syncedAt: string;
  isCandidate: boolean;
  extractionStatus: ExtractionStatus;
  matchedAmount: string | null;
  matchedReference: string | null;
  payerName: string | null;
  payerPhone: string | null;
  canExtract: boolean;
}

const STATUS_FILTERS: { label: string; value: ExtractionStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Buffered', value: 'BUFFERED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Ignored', value: 'IGNORED' },
];

const STATUS_COLOR: Record<ExtractionStatus, string> = {
  PENDING: Colors.warning,
  BUFFERED: Colors.success,
  FAILED: Colors.error,
  IGNORED: '#888',
};

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d;
  }
}

function MessageCard({ item }: { item: MessageLog }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = STATUS_COLOR[item.extractionStatus] ?? colors.textMuted;
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor + '28' }]}>
          <View style={[styles.statusDotInner, { backgroundColor: statusColor }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sender} numberOfLines={1}>
            {item.sender ?? item.senderPhone ?? '—'}
          </Text>
          <Text style={styles.date}>{formatDateTime(item.messageDate)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.extractionStatus}
            </Text>
          </View>
          {item.isCandidate && (
            <View style={styles.candidateBadge}>
              <Text style={styles.candidateBadgeText}>Candidate</Text>
            </View>
          )}
        </View>
      </View>

      {/* Matched details row */}
      {(item.matchedAmount || item.matchedReference || item.payerName) && (
        <View style={styles.matchRow}>
          {item.matchedAmount ? (
            <View style={styles.matchChip}>
              <Ionicons name="cash-outline" size={11} color={colors.primary} />
              <Text style={[styles.matchChipText, { color: colors.primary }]}>
                {item.matchedAmount}
              </Text>
            </View>
          ) : null}
          {item.matchedReference ? (
            <View style={styles.matchChip}>
              <Ionicons name="document-text-outline" size={11} color={colors.primary} />
              <Text style={[styles.matchChipText, { color: colors.primary }]}>
                {item.matchedReference}
              </Text>
            </View>
          ) : null}
          {item.payerName ? (
            <View style={styles.matchChip}>
              <Ionicons name="person-outline" size={11} color={colors.textSecondary} />
              <Text style={[styles.matchChipText, { color: colors.textSecondary }]}>
                {item.payerName}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Message body — collapsed to 2 lines, tap to expand */}
      <Text style={styles.body} numberOfLines={expanded ? undefined : 2}>
        {item.messageBody}
      </Text>

      {expanded && (
        <Text style={styles.syncedAt}>
          Synced: {formatDateTime(item.syncedAt)}
        </Text>
      )}

      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={colors.textMuted}
        style={{ alignSelf: 'center', marginTop: 4 }}
      />
    </TouchableOpacity>
  );
}

const PAGE_SIZE = 30;

export default function SmsMessageLogs() {
  const { credentialId, credentialName } = useLocalSearchParams<{
    credentialId: string;
    credentialName?: string;
  }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeFilter, setActiveFilter] = useState<ExtractionStatus | null>(null);

  const { data, loading, error, refetch, fetchMore } = useQuery(SMS_MESSAGE_LOGS_QUERY, {
    variables: {
      credentialId,
      first: PAGE_SIZE,
      extractionStatus: activeFilter ?? undefined,
    },
    fetchPolicy: 'cache-and-network',
    skip: !credentialId,
  });

  const messages: MessageLog[] =
    data?.smsReceiptMessageLogs?.edges?.map((e: any) => e.node) ?? [];
  const pageInfo = data?.smsReceiptMessageLogs?.pageInfo;

  const loadMore = () => {
    if (!pageInfo?.hasNextPage || loading) return;
    fetchMore({
      variables: {
        credentialId,
        first: PAGE_SIZE,
        after: pageInfo.endCursor,
        extractionStatus: activeFilter ?? undefined,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          smsReceiptMessageLogs: {
            ...fetchMoreResult.smsReceiptMessageLogs,
            edges: [
              ...(prev.smsReceiptMessageLogs?.edges ?? []),
              ...(fetchMoreResult.smsReceiptMessageLogs?.edges ?? []),
            ],
          },
        };
      },
    });
  };

  const [reExtract, { loading: reExtracting }] = useMutation(RE_EXTRACT_PENDING_SMS_RECEIPTS);

  const handleReExtract = async () => {
    try {
      const { data } = await reExtract({
        variables: {
          input: {
            credentialId,
            forceReparse: true,
            includeIgnored: false,
            clientMutationId: `reextract-${Date.now()}`,
          },
        },
      });
      const result = data?.reExtractPendingSmsReceipts;
      if (!result?.success) {
        Alert.alert('Re-extract Failed', result?.message ?? 'Something went wrong.');
        return;
      }
      Alert.alert(
        'Re-extraction Complete',
        `Parsed: ${result.parsedCount ?? 0}  ·  Buffered: ${result.bufferedCount ?? 0}  ·  Skipped: ${result.skippedCount ?? 0}  ·  Failed: ${result.failedCount ?? 0}`,
      );
      refetch();
    } catch (e: any) {
      Alert.alert('Re-extract Error', e?.message ?? 'Something went wrong.');
    }
  };

  const handleFilterChange = (value: ExtractionStatus | null) => {
    setActiveFilter(value);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        title={credentialName ? `${credentialName} — Messages` : 'Synced Messages'}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={handleReExtract}
            disabled={reExtracting}
            hitSlop={8}
            style={{ opacity: reExtracting ? 0.5 : 1 }}
          >
            {reExtracting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh-circle-outline" size={26} color={colors.primary} />
            )}
          </TouchableOpacity>
        }
      />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = activeFilter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleFilterChange(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && messages.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageCard item={item} />}
          contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No Messages"
              description={
                activeFilter
                  ? `No ${activeFilter.toLowerCase()} messages for this credential.`
                  : 'No synced messages yet. Use "Read SMS Now" or wait for auto-sync.'
              }
            />
          }
          ListFooterComponent={
            pageInfo?.hasNextPage ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: Spacing.md }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1 },

    filterRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      flexWrap: 'wrap',
    },
    filterChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full ?? 99,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.overlay,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textSecondary,
    },
    filterChipTextActive: {
      color: '#fff',
    },

    listContent: {
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    statusDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    statusDotInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    sender: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    date: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 1,
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: Typography.fontWeightSemibold,
    },
    candidateBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      backgroundColor: c.primary + '18',
    },
    candidateBadgeText: {
      fontSize: 10,
      fontWeight: Typography.fontWeightMedium,
      color: c.primary,
    },

    matchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: Spacing.xs,
    },
    matchChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      backgroundColor: c.overlay,
    },
    matchChipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
    },

    body: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      lineHeight: 18,
      marginTop: 2,
    },
    syncedAt: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: Spacing.xs,
    },
  });
}
