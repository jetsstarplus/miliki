import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import { ARREARS_REPORT_QUERY } from '../../graphql/properties/queries/arrears';

interface Schedule {
  id: string;
  expectedAmount: string;
  paidAmount: string;
  dueDate: string;
  status: string;
  daysOverdue: number;
  balance: string;
  tenant: { fullName: string };
  unit: { unitNumber: string; accountNumber?: string };
  building: { name: string };
}

interface ArrearsReport {
  summary: { totalExpected: string; totalPaid: string; totalArrears: string };
  schedules: { edges: { node: Schedule }[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
}

function statusColor(s: string): 'error' | 'warning' | 'info' {
  if (s === 'OVERDUE') return 'error';
  if (s === 'PARTIAL') return 'warning';
  return 'info';
}

function ScheduleRow({ item }: { item: Schedule }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName} numberOfLines={1}>{item.tenant?.fullName ?? '—'}</Text>
          <Text style={styles.unitText}>
            Unit {item.unit?.unitNumber ?? '—'} · {item.building?.name ?? '—'}
          </Text>
        </View>
        <StatusBadge label={item.status} color={statusColor(item.status)} />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Expected</Text>
          <Text style={styles.amountValue}>
            KES {Number(item.expectedAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>
            KES {Number(item.paidAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, { color: Colors.error }]}>
            KES {Number(item.balance ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.footerText}>Due: {item.dueDate ?? '—'}</Text>
        </View>
        {item.daysOverdue > 0 && (
          <View style={styles.footerItem}>
            <Ionicons name="warning-outline" size={12} color={Colors.error} />
            <Text style={[styles.footerText, { color: Colors.error }]}>
              {item.daysOverdue} days overdue
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function Arrears() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery<{ arrearsReport: ArrearsReport }>(
    ARREARS_REPORT_QUERY,
    { fetchPolicy: 'cache-and-network', variables: { first: 30 } },
  );

  const report = data?.arrearsReport;
  const schedules = report?.schedules?.edges?.map(e => e.node) ?? [];

  async function onRefresh() {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }

  function onEndReached() {
    if (!report?.schedules?.pageInfo?.hasNextPage) return;
    fetchMore({ variables: { after: report.schedules.pageInfo.endCursor } });
  }

  if (loading && !data) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Arrears" />
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Arrears" />
      <ErrorState message={error.message} onRetry={refetch} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Arrears" />

      {/* Summary banner */}
      {report?.summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expected</Text>
            <Text style={styles.summaryValue}>
              KES {Number(report.summary.totalExpected ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              KES {Number(report.summary.totalPaid ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Arrears</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              KES {Number(report.summary.totalArrears ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ScheduleRow item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading ? <EmptyState icon="warning-outline" title="No arrears found" description="All schedules are up to date." /> : null
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    summaryRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingVertical: Spacing.md,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: c.text },
    summaryDivider: { width: 1, backgroundColor: c.borderLight, marginVertical: 4 },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
    tenantName: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
    unitText: { fontSize: Typography.fontSizeXs, color: c.textSecondary, marginTop: 2 },

    amountsRow: { flexDirection: 'row', marginBottom: Spacing.sm },
    amountItem: { flex: 1, alignItems: 'center' },
    amountLabel: { fontSize: 10, color: c.textMuted, marginBottom: 1 },
    amountValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },

    cardFooter: { flexDirection: 'row', gap: Spacing.md },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { fontSize: 11, color: c.textMuted },
  });
}
