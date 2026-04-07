import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import { RENT_SCHEDULES } from '../../graphql/properties/queries/rentschedules';

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID';

interface RentSchedule {
  id: string;
  expectedAmount: string;
  paidAmount: string;
  balance: string;
  dueDate: string;
  status: string;
  rentAmount: string;
  serviceCharge: string;
  penalty: string;
  periodStart: string;
  periodEnd: string;
  isOverdue: boolean;
  unit: { id: string; unitNumber: string };
  building: { id: string; name: string };
  tenant: { id: string; fullName: string };
}

function scheduleStatusColor(s: string): 'success' | 'warning' | 'error' | 'info' {
  if (s === 'PAID') return 'success';
  if (s === 'PARTIAL') return 'warning';
  if (s === 'OVERDUE') return 'error';
  if (s === 'VOID') return 'info';
  return 'info';
}

function ScheduleCard({ item }: { item: RentSchedule }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, item.isOverdue && styles.overdueCard]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName} numberOfLines={1}>{item.tenant?.fullName ?? '—'}</Text>
          <Text style={styles.unitText}>
            Unit {item.unit?.unitNumber ?? '—'} · {item.building?.name ?? '—'}
          </Text>
        </View>
        <StatusBadge label={item.status} color={scheduleStatusColor(item.status)} />
      </View>

      <View style={styles.periodRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
        <Text style={styles.periodText}>
          {item.periodStart} – {item.periodEnd}
        </Text>
        <Text style={styles.dueDateText}>Due: {item.dueDate}</Text>
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
          <Text style={[styles.amountValue, { color: Number(item.balance) > 0 ? Colors.error : Colors.success }]}>
            KES {Number(item.balance ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {Number(item.penalty) > 0 && (
        <View style={styles.penaltyRow}>
          <Ionicons name="warning-outline" size={12} color={Colors.error} />
          <Text style={[styles.periodText, { color: Colors.error }]}>
            Penalty: KES {Number(item.penalty).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const STATUS_FILTERS: StatusFilter[] = ['ALL', 'OVERDUE', 'PARTIAL', 'PENDING', 'PAID', 'VOID'];

export default function RentSchedules() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery(RENT_SCHEDULES, {
    variables: { first: 30 },
    fetchPolicy: 'cache-and-network',
  });

  const allSchedules: RentSchedule[] = data?.rentSchedules?.edges?.map((e: any) => e.node) ?? [];
  const schedules = activeFilter === 'ALL'
    ? allSchedules
    : allSchedules.filter(s => s.status === activeFilter);

  const pageInfo = data?.rentSchedules?.pageInfo;

  async function onRefresh() {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }

  function onEndReached() {
    if (!pageInfo?.hasNextPage) return;
    fetchMore({ variables: { after: pageInfo.endCursor } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Rent Schedules" />

      {/* Status filters */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={f => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8, paddingVertical: Spacing.sm }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterLabel, activeFilter === f && { color: colors.primary }]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ScheduleCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No schedules" description="No rent schedules found for this filter." />}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    filterWrap: { backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.borderLight },
    filterChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      borderRadius: Radius.md,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    filterChipActive: { backgroundColor: c.overlay, borderColor: c.primary },
    filterLabel: { fontSize: 12, fontWeight: Typography.fontWeightMedium, color: c.textMuted },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    overdueCard: { borderLeftWidth: 3, borderLeftColor: Colors.error },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
    tenantName: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    unitText: { fontSize: 11, color: c.textSecondary, marginTop: 1 },

    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    periodText: { fontSize: 11, color: c.textMuted, flex: 1 },
    dueDateText: { fontSize: 11, color: c.textSecondary },

    amountsRow: { flexDirection: 'row' },
    amountItem: { flex: 1, alignItems: 'center' },
    amountLabel: { fontSize: 10, color: c.textMuted, marginBottom: 1 },
    amountValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },

    penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  });
}
