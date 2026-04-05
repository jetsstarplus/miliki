import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { UNITS_QUERY } from '@/graphql/properties/queries/units';
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

interface Unit {
  id: string;
  unitNumber: string;
  accountNumber: string;
  floor: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  squareFeet: number;
  status: string;
  isAvailableForRent: boolean;
  isAvailableForPurchase: boolean;
  arrears: number;
  building: { name: string };
  occupancies?: { edges: { node: { isCurrent: boolean; tenant: { fullName: string } } }[] };
}

type AvailabilityFilter = 'all' | 'rent' | 'purchase' | 'occupied' | 'vacant';

function UnitCard({ unit }: { unit: Unit }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // const statusLabel = unit.isAvailableForRent ? 'Available' : (unit.status || 'Occupied');
  const statusLabel = (unit.status || 'Occupied');
  const statusColor: 'success' | 'error' = unit.isAvailableForRent ? 'success' : 'error';
  const currentTenant = unit.occupancies?.edges?.find(e => e.node.isCurrent)?.node.tenant.fullName;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/units/[id]', params: { id: unit.id } } as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.unitBadge}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.unitNumber}>Unit {unit.unitNumber}</Text>
          <Text style={styles.buildingName} numberOfLines={1}>{unit.building?.name ?? '—'}</Text>
        </View>
        <StatusBadge label={statusLabel} color={statusColor} />
      </View>

      <View style={styles.statsRow}>
        {unit.floor ? (
          <View style={styles.stat}>
            <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>Floor {unit.floor}</Text>
          </View>
        ) : null}
        {unit.bedrooms != null ? (
          <View style={styles.stat}>
            <Ionicons name="bed-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{unit.bedrooms} bd</Text>
          </View>
        ) : null}
        {unit.bathrooms != null ? (
          <View style={styles.stat}>
            <Ionicons name="water-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{unit.bathrooms} ba</Text>
          </View>
        ) : null}
        {unit.squareFeet ? (
          <View style={styles.stat}>
            <Ionicons name="resize-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{unit.squareFeet} sqft</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rentRow}>
        <Text style={styles.rentLabel}>Monthly rent</Text>
        <Text style={styles.rentAmount}>KES {Number(unit.monthlyRent ?? 0).toLocaleString()}</Text>
      </View>

      {currentTenant && (
        <View style={styles.tenantRow}>
          <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.tenantText} numberOfLines={1}>{currentTenant}</Text>
        </View>
      )}

      {(unit.arrears ?? 0) > 0 && (
        <View style={styles.arrearsRow}>
          <Ionicons name="warning-outline" size={12} color={Colors.error} />
          <Text style={styles.arrearsText}>Arrears: KES {Number(unit.arrears).toLocaleString()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const AVAILABILITY_FILTERS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rent', label: 'For Rent' },
  { value: 'purchase', label: 'For Purchase' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
];

export default function Units() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [withArrears, setWithArrears] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const queryVars = useMemo(() => {
    const v: Record<string, any> = {};
    if (debouncedSearch) v.search = debouncedSearch;
    if (availability === 'rent') v.isAvailableForRent = true;
    if (availability === 'purchase') v.isAvailableForPurchase = true;
    if (availability === 'occupied') v.isAvailableForRent = false;
    if (availability === 'vacant') v.isAvailableForRent = true;
    return v;
  }, [debouncedSearch, availability]);

  const { nodes: allUnits, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<Unit>(UNITS_QUERY, 'units', 50, queryVars);

  // 'has arrears' is not a backend filter — applied client-side on top
  const units = useMemo(
    () => (withArrears ? allUnits.filter(u => (u.arrears ?? 0) > 0) : allUnits),
    [allUnits, withArrears],
  );

  const activeFilterCount =
    (availability !== 'all' ? 1 : 0) + (withArrears ? 1 : 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Units"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/units/add' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by unit, building, account…"
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

      {/* Filter chips */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {AVAILABILITY_FILTERS.map(f => {
            const active = availability === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setAvailability(f.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.chipDivider} />

          {/* Arrears toggle chip */}
          <TouchableOpacity
            style={[styles.chip, withArrears && styles.chipError]}
            onPress={() => setWithArrears(v => !v)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="warning-outline"
              size={12}
              color={withArrears ? Colors.error : colors.textMuted}
            />
            <Text style={[styles.chipText, withArrears && styles.chipTextError]}>
              Has arrears
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.clearFilters}
            onPress={() => { setAvailability('all'); setWithArrears(false); }}
            hitSlop={8}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results count */}
      {!loading && allUnits.length > 0 && (
        <Text style={styles.countText}>
          {units.length} unit{units.length !== 1 ? 's' : ''}{debouncedSearch || activeFilterCount > 0 ? ' matched' : ''}
        </Text>
      )}

      {loading && units.length === 0 && <LoadingState />}

      {error && units.length === 0 && (
        <ErrorState
          title="Failed to load units"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={units}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <UnitCard unit={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && units.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              debouncedSearch || activeFilterCount > 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.noResultsTitle}>No units found</Text>
                  <Text style={styles.noResultsSub}>Try adjusting your search or filters.</Text>
                </View>
              ) : (
                <EmptyState
                  icon="home-outline"
                  title="No units yet"
                  description="Add your first unit to get started."
                  action={{ label: 'Add unit', onPress: () => router.push('/units/add' as any) }}
                />
              )
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Search
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

  // Filters
  filtersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    paddingBottom: Spacing.sm,
  },
  filtersRow: {
    paddingHorizontal: Spacing.md,
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
  chipActive: {
    borderColor: c.primary,
    backgroundColor: c.overlay,
  },
  chipError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  chipText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.fontWeightMedium,
    color: c.textSecondary,
  },
  chipTextActive: { color: c.primary },
  chipTextError: { color: Colors.error },
  chipDivider: {
    width: 1,
    height: 18,
    backgroundColor: c.borderLight,
    marginHorizontal: Spacing.xs,
  },
  clearFilters: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
  },
  clearFiltersText: {
    fontSize: Typography.fontSizeXs,
    color: c.primary,
    fontWeight: Typography.fontWeightSemibold,
  },

  // Count
  countText: {
    fontSize: Typography.fontSizeXs,
    color: c.textMuted,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },

  // No results
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  noResultsTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
  },
  noResultsSub: {
    fontSize: Typography.fontSizeSm,
    color: c.textMuted,
    textAlign: 'center',
  },

  // Card
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
  unitBadge: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitNumber: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
  },
  buildingName: {
    fontSize: Typography.fontSizeXs,
    color: c.textMuted,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  rentLabel: { fontSize: Typography.fontSizeSm, color: c.textMuted },
  rentAmount: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightBold,
    color: c.primary,
  },
  arrearsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.06)',
    padding: Spacing.xs,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  arrearsText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.error,
    fontWeight: Typography.fontWeightMedium,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  tenantText: {
    fontSize: Typography.fontSizeXs,
    color: c.textSecondary,
    flex: 1,
  },
  });
}
