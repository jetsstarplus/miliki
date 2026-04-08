import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { LEASE_LIST } from '@/graphql/properties/queries/leases';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

interface Lease {
  id: string;
  leaseNumber: string;
  leaseType: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  serviceCharge: number;
  depositAmount: number;
  paymentFrequency: string;
  occupancy: {
    id: string;
    tenant: { id: string; fullName: string };
    unit: {
      id: string;
      unitNumber: string;
      accountNumber: string;
      unitType?: { id: string; name: string };
    };
  };
}

type StatusFilter = 'all' | 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RENEWED', label: 'Renewed' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: Colors.success,
  DRAFT: '#6B7280',
  EXPIRED: Colors.warning,
  TERMINATED: Colors.error,
  RENEWED: '#3B82F6',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function LeaseCard({ item }: { item: Lease }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
  const tenant = item.occupancy?.tenant;
  const unit = item.occupancy?.unit;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaseNumber} numberOfLines={1}>
            {item.leaseNumber ?? `Lease #${item.id}`}
          </Text>
          {tenant?.fullName ? (
            <Text style={styles.tenantName} numberOfLines={1}>{tenant.fullName}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      {unit && (
        <View style={styles.unitRow}>
          <Ionicons name="home-outline" size={12} color={colors.textMuted} />
          <Text style={styles.unitText}>
            Unit {unit.unitNumber}
            {unit.unitType?.name ? ` · ${unit.unitType.name}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Start</Text>
          <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>End</Text>
          <Text style={styles.dateValue}>{item.endDate ? formatDate(item.endDate) : 'Open-ended'}</Text>
        </View>
      </View>

      <View style={styles.financialRow}>
        <View style={styles.financialItem}>
          <Text style={styles.financialLabel}>Rent</Text>
          <Text style={styles.financialValue}>KES {Number(item.rentAmount ?? 0).toLocaleString()}</Text>
        </View>
        {item.depositAmount != null && (
          <>
            <View style={styles.divider} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Deposit</Text>
              <Text style={styles.financialValue}>KES {Number(item.depositAmount).toLocaleString()}</Text>
            </View>
          </>
        )}
        {item.paymentFrequency && (
          <>
            <View style={styles.divider} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Frequency</Text>
              <Text style={styles.financialValue}>{item.paymentFrequency}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function Leases() {
  const router = useRouter();
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

  const { nodes: allLeases, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<Lease>(LEASE_LIST, 'leases', 50);

  const leases = useMemo(() => {
    let result = allLeases;
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(l =>
        l.leaseNumber?.toLowerCase().includes(q) ||
        l.occupancy?.tenant?.fullName?.toLowerCase().includes(q) ||
        l.occupancy?.unit?.unitNumber?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allLeases, statusFilter, debouncedSearch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Leases" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by lease number, tenant, unit…"
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
      <View style={styles.filtersWrap} >      
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f.label}
                </Text>
                </TouchableOpacity>
            );
            })}
        </ScrollView>
      </View>

      {loading && leases.length === 0 && <LoadingState />}

      {error && leases.length === 0 && (
        <ErrorState
          title="Failed to load leases"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={leases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/leases/[id]', params: { id: item.id } } as any)}
            >
              <LeaseCard item={item} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && leases.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="document-text-outline"
                title={debouncedSearch || statusFilter !== 'all' ? 'No leases found' : 'No leases yet'}
                description={debouncedSearch || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Lease agreements will appear here once created.'}
              />
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/leases/add' as any)}
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
    searchInput: { flex: 1, fontSize: Typography.fontSizeSm, color: c.text, paddingVertical: 0 },

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
    chipText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium, color: c.textSecondary },
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
      width: 42,
      height: 42,
      borderRadius: Radius.sm,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leaseNumber: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    tenantName: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },

    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: Spacing.sm,
    },
    unitText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },

    datesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    dateItem: { flex: 1 },
    dateLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: 2 },
    dateValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },

    financialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    financialItem: { flex: 1, alignItems: 'center' },
    financialLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: 2 },
    financialValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    divider: { width: 1, height: 28, backgroundColor: c.borderLight },
  });
}
