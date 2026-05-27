import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { UNITS_QUERY } from '@/graphql/properties/queries/units';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export interface UnitListItem {
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
type Scope = 'all' | 'building';

const AVAILABILITY_FILTERS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rent', label: 'For Rent' },
  { value: 'purchase', label: 'For Purchase' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
];

function UnitCard({ unit, onPress }: { unit: UnitListItem; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusLabel = unit.status || 'Occupied';
  const statusColor: 'success' | 'error' = unit.isAvailableForRent ? 'success' : 'error';
  const currentTenant = unit.occupancies?.edges?.find((e) => e.node.isCurrent)?.node.tenant.fullName;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.unitBadge}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.unitNumber}>Unit {unit.unitNumber}</Text>
          <Text style={styles.buildingName} numberOfLines={1}>{unit.building?.name ?? '-'}</Text>
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
          <Ionicons name="warning-outline" size={12} color={colors.error} />
          <Text style={styles.arrearsText}>Arrears: KES {Number(unit.arrears).toLocaleString()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface UnitListSharedProps {
  scope?: Scope;
  buildingId?: string;
  embedded?: boolean;
  onSelectUnit?: (id: string) => void;
}

export function UnitListShared({ scope = 'all', buildingId, embedded = false, onSelectUnit }: UnitListSharedProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isTablet = width >= 768;

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
    if (scope === 'building' && buildingId) v.buildingId = buildingId;
    if (debouncedSearch) v.search = debouncedSearch;
    if (availability === 'rent') v.isAvailableForRent = true;
    if (availability === 'purchase') v.isAvailableForPurchase = true;
    if (availability === 'occupied') v.status = 'OCCUPIED';
    if (availability === 'vacant') v.status = 'VACANT';
    return v;
  }, [scope, buildingId, debouncedSearch, availability]);

  const { nodes: allUnits, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<UnitListItem>(UNITS_QUERY, 'units', 50, queryVars);

  const units = useMemo(
    () => (withArrears ? allUnits.filter((u) => (u.arrears ?? 0) > 0) : allUnits),
    [allUnits, withArrears],
  );

  const activeFilterCount = (availability !== 'all' ? 1 : 0) + (withArrears ? 1 : 0);

  const handleUnitPress = useCallback((unitId: string) => {
    if (onSelectUnit) {
      onSelectUnit(unitId);
      return;
    }
    router.push({ pathname: '/units/[id]', params: { id: unitId } } as any);
  }, [onSelectUnit, router]);

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      <View style={[styles.searchWrap, embedded && styles.searchWrapEmbedded]}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by unit, building, account..."
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

      <View style={[styles.filtersWrap, embedded && styles.filtersWrapEmbedded]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filtersRow, embedded && styles.filtersRowEmbedded]}
        >
          {AVAILABILITY_FILTERS.map((f) => {
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

          <TouchableOpacity
            style={[styles.chip, withArrears && styles.chipError]}
            onPress={() => setWithArrears((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="warning-outline" size={12} color={withArrears ? colors.error : colors.textMuted} />
            <Text style={[styles.chipText, withArrears && styles.chipTextError]}>Has arrears</Text>
          </TouchableOpacity>
        </ScrollView>

        {activeFilterCount > 0 && (
          <TouchableOpacity style={styles.clearFilters} onPress={() => { setAvailability('all'); setWithArrears(false); }} hitSlop={8}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && allUnits.length > 0 && (
        <Text style={[styles.countText, embedded && styles.countTextEmbedded]}>
          {units.length} unit{units.length !== 1 ? 's' : ''}{debouncedSearch || activeFilterCount > 0 ? ' matched' : ''}
        </Text>
      )}

      {loading && units.length === 0 && <LoadingState />}

      {error && units.length === 0 && (
        <ErrorState title="Failed to load units" message={error.message} onRetry={() => refetch()} />
      )}

      {!error && embedded && (
        <View style={[styles.listWrap, embedded && styles.listWrapEmbedded]}>
          {units.map((item) => (
            <UnitCard key={item.id} unit={item} onPress={() => handleUnitPress(item.id)} />
          ))}

          {hasMore && units.length > 0 && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={onEndReached}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}

          {!loading && units.length === 0 && (
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
                description={scope === 'building' ? 'No units were found under this building.' : 'Add your first unit to get started.'}
              />
            )
          )}
        </View>
      )}

      {!error && !embedded && (
        <FlatList
          key={isTablet ? 'units-grid-2' : 'units-list-1'}
          style={styles.flatList}
          data={units}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
          renderItem={({ item, index }) => (
            <View
              style={[
                isTablet ? styles.listItemHalf : styles.listItemWrap,
                isTablet && (index % 2 === 0 ? styles.listItemLeft : styles.listItemRight),
              ]}
            >
              <UnitCard unit={item} onPress={() => handleUnitPress(item.id)} />
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListFooterComponent={hasMore && units.length > 0 ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
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
                  description={scope === 'building' ? 'No units were found under this building.' : 'Add your first unit to get started.'}
                />
              )
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    containerEmbedded: {
      backgroundColor: 'transparent',
    },
    flatList: {
      flex: 1,
      backgroundColor: c.background,
    },
    listWrap: { padding: Spacing.md, paddingBottom: Spacing.md },
    listWrapEmbedded: { paddingHorizontal: Spacing.xs, paddingTop: Spacing.xs },
    list: { padding: Spacing.md, paddingBottom: 80 },
    columnWrapper: { alignItems: 'stretch', justifyContent: 'flex-start' },
    listItemWrap: { flex: 1 },
    listItemHalf: { width: '50%' },
    listItemLeft: { paddingRight: Spacing.xs },
    listItemRight: { paddingLeft: Spacing.xs },
    footer: { paddingVertical: Spacing.md },

    searchWrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      backgroundColor: c.surface,
    },
    searchWrapEmbedded: {
      paddingHorizontal: Spacing.xs,
      paddingTop: 0,
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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingBottom: Spacing.sm,
    },
    filtersWrapEmbedded: {
      paddingBottom: Spacing.xs,
    },
    filtersRow: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      alignItems: 'center',
    },
    filtersRowEmbedded: {
      paddingHorizontal: Spacing.xs,
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
      borderColor: c.error,
      backgroundColor: 'rgba(239,68,68,0.06)',
    },
    chipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textSecondary,
    },
    chipTextActive: { color: c.primary },
    chipTextError: { color: c.error },
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

    countText: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
    },
    countTextEmbedded: {
      paddingHorizontal: Spacing.xs,
      paddingTop: Spacing.xs,
    },

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
      color: c.error,
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
    loadMoreBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    loadMoreText: {
      fontSize: Typography.fontSizeSm,
      color: c.primary,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
