import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { MAINTENANCES } from '@/graphql/properties/queries/maintenance';
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

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requestedDate: string;
  scheduledDate: string;
  resolvedDate: string;
  vendorName: string;
  estimatedCost: number;
  actualCost: number;
  building: { id: string; name: string };
  unit: { id: string; description: string };
  tenant: { id: string; fullName: string };
}

type PriorityFilter = 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type StatusFilter = 'all' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: Colors.error,
  HIGH: '#F97316',
  MEDIUM: Colors.warning,
  LOW: '#3B82F6',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3B82F6',
  TRIAGE: Colors.warning,
  SCHEDULED: '#8B5CF6',
  IN_PROGRESS: Colors.warning,
  ON_HOLD: '#9CA3AF',
  COMPLETED: Colors.success,
  CANCELLED: Colors.error,
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function MaintenanceCard({ item }: { item: MaintenanceRequest }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const priorityColor = PRIORITY_COLORS[item.priority] ?? colors.textMuted;
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.building?.name ? (
            <Text style={styles.subLabel} numberOfLines={1}>
              {item.building.name}{item.unit?.description ? ` · Unit ${item.unit.description}` : ''}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {(item.status ?? '').replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.category ? (
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.category.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
        {item.tenant?.fullName ? (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.tenant.fullName}</Text>
          </View>
        ) : null}
        {item.requestedDate ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.requestedDate)}</Text>
          </View>
        ) : null}
      </View>

      {item.estimatedCost != null && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Estimated:</Text>
          <Text style={styles.costValue}>KES {Number(item.estimatedCost).toLocaleString()}</Text>
          {item.actualCost != null && (
            <>
              <Text style={styles.costLabel}> · Actual:</Text>
              <Text style={[styles.costValue, { color: Colors.success }]}>
                KES {Number(item.actualCost).toLocaleString()}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default function Maintenance() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const { nodes: allItems, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<MaintenanceRequest>(MAINTENANCES, 'maintenanceRequests', 50);

  const items = useMemo(() => {
    let result = allItems;
    if (priorityFilter !== 'all') result = result.filter(m => m.priority === priorityFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.building?.name?.toLowerCase().includes(q) ||
        m.tenant?.fullName?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allItems, priorityFilter, debouncedSearch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Maintenance" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, building, tenant…"
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

      {/* Priority filters */}
      <View style={styles.filtersWrap} >
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
        >
            {PRIORITY_FILTERS.map(f => {
            const active = priorityFilter === f.value;
            const tint = f.value !== 'all' ? PRIORITY_COLORS[f.value] : undefined;
            return (
                <TouchableOpacity
                key={f.value}
                style={[
                    styles.chip,
                    active && (tint ? { borderColor: tint, backgroundColor: tint + '18' } : styles.chipActive),
                ]}
                onPress={() => setPriorityFilter(f.value)}
                activeOpacity={0.7}
                >
                {f.value !== 'all' && (
                    <View style={[styles.chipDot, { backgroundColor: tint ?? colors.textMuted }]} />
                )}
                <Text style={[styles.chipText, active && (tint ? { color: tint } : styles.chipTextActive)]}>
                    {f.label}
                </Text>
                </TouchableOpacity>
            );
            })}
        </ScrollView>
      </View>

      {loading && items.length === 0 && <LoadingState />}

      {error && items.length === 0 && (
        <ErrorState
          title="Failed to load maintenance requests"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MaintenanceCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && items.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="construct-outline"
                title={debouncedSearch || priorityFilter !== 'all' ? 'No requests found' : 'No maintenance requests'}
                description={debouncedSearch || priorityFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Maintenance requests will appear here once logged.'}
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
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm + 2,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    chipActive: { borderColor: c.primary, backgroundColor: c.overlay },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
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
    priorityDot: { width: 10, height: 10, borderRadius: 5 },
    title: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
    subLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },

    costRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 3 },
    costLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted },
    costValue: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium, color: c.text },
  });
}
