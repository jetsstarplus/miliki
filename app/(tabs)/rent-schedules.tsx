import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { RENT_SCHEDULES } from '@/graphql/properties/queries/rentschedules';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RentSchedule {
  id: string;
  unit: { unitNumber: string; id: string };
  building: { name: string; id: string };
  tenant: { id: string; fullName: string };
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  rentAmount: number;
  serviceCharge: number;
  penalty: number;
  expectedAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  notes: string;
}

type StatusFilter = 'all' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
];

const STATUS_COLORS: Record<string, string> = {
  PAID: Colors.success,
  OVERDUE: Colors.error,
  PENDING: Colors.warning,
  PARTIAL: '#3B82F6',
  VOID: Colors.warning,
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function ScheduleCard({ item }: { item: RentSchedule }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName} numberOfLines={1}>
            {item.tenant?.fullName ?? '—'}
          </Text>
          <Text style={styles.unitLabel} numberOfLines={1}>
            Unit {item.unit?.unitNumber} · {item.building?.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.periodRow}>
        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
        <Text style={styles.periodText}>
          {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
        </Text>
        <Text style={styles.dueDateText}>Due: {formatDate(item.dueDate)}</Text>
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Expected</Text>
          <Text style={styles.amountValue}>KES {Number(item.expectedAmount ?? 0).toLocaleString()}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>
            KES {Number(item.paidAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, { color: item.balance > 0 ? Colors.error : colors.text }]}>
            KES {Number(item.balance ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RentSchedules() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const { nodes: schedules, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<RentSchedule>(RENT_SCHEDULES, 'rentSchedules', 50);

  const filtered = useMemo(() => {
    let result = schedules;
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(s =>
        s.tenant?.fullName?.toLowerCase().includes(q) ||
        s.unit?.unitNumber?.toLowerCase().includes(q) ||
        s.building?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [schedules, statusFilter, debouncedSearch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Rent Schedules" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tenant, unit, building…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersWrap}
        contentContainerStyle={styles.filtersRow}
      >
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && filtered.length === 0 && <LoadingState />}

      {error && filtered.length === 0 && (
        <ErrorState
          title="Failed to load schedules"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ScheduleCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && filtered.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="calendar-outline"
                title={debouncedSearch || statusFilter !== 'all' ? 'No schedules found' : 'No rent schedules yet'}
                description={debouncedSearch || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Rent schedules appear here once tenants are assigned.'}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: 80 },
    footer: { paddingVertical: Spacing.md },

    searchWrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      backgroundColor: c.surface,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
      height: 42,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.fontSizeSm,
      color: c.text,
      paddingVertical: 0,
    },

    filtersWrap: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    filtersRow: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.xs,
    },
    chip: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm + 2,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    chipActive: { borderColor: c.primary, backgroundColor: c.overlay },
    chipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textSecondary,
    },
    chipTextActive: { color: c.primary },

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
      width: 38,
      height: 38,
      borderRadius: Radius.sm,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tenantName: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    unitLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },

    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: Spacing.sm,
    },
    periodText: { fontSize: Typography.fontSizeXs, color: c.textMuted, flex: 1 },
    dueDateText: { fontSize: Typography.fontSizeXs, color: c.textSecondary, fontWeight: Typography.fontWeightMedium },

    amountsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    amountItem: { flex: 1, alignItems: 'center' },
    amountLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: 2 },
    amountValue: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    amountDivider: { width: 1, height: 30, backgroundColor: c.borderLight },
  });
}
