import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OccupancyBar } from '@/components/ui/OccupancyBar';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { BUILDING_LIST } from '@/graphql/properties/queries/building';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Building {
  id: string;
  name: string;
  code: string;
  buildingType: string;
  address: string;
  city: string;
  county: string;
  totalUnits: number;
  occupiedUnitsCount: number;
  vacantUnitsCount: number;
  occupancyRate: number;
  numberOfFloors: number;
  yearBuilt: number;
  managerName: string;
}

function BuildingCard({ building }: { building: Building }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const typeLabel = building.buildingType
    ? building.buildingType.replace(/_/g, ' ')
    : '—';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/building/[id]', params: { id: building.id } } as any)}
    >
      {/* Top row */}
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.buildingName} numberOfLines={1}>{building.name}</Text>
          <Text style={styles.buildingCode}>{building.code ?? typeLabel}</Text>
        </View>
        <View style={[styles.typeBadge]}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Location */}
      {(building.city || building.address) && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[building.address, building.city, building.county].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{building.totalUnits ?? '—'}</Text>
          <Text style={styles.statLabel}>Units</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{building.occupiedUnitsCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{building.vacantUnitsCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{building.numberOfFloors ?? '—'}</Text>
          <Text style={styles.statLabel}>Floors</Text>
        </View>
      </View>

      {/* Occupancy bar */}
      <View style={styles.occupancyRow}>
        <Text style={styles.occupancyLabel}>
          Occupancy {(building.occupancyRate ?? 0).toFixed(0)}%
        </Text>
      </View>
      <OccupancyBar rate={building.occupancyRate} />
    </TouchableOpacity>
  );
}

export default function Buildings() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const queryVars = useMemo(
    () => (debouncedSearch ? { search: debouncedSearch } : {}),
    [debouncedSearch],
  );

  const { nodes: buildings, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<Building>(BUILDING_LIST, 'buildings', 50, queryVars);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Buildings"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/building/add' as any)}
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
            placeholder="Search buildings…"
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

      {loading && buildings.length === 0 && <LoadingState />}

      {error && buildings.length === 0 && (
        <ErrorState
          title="Failed to load buildings"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={buildings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <BuildingCard building={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && buildings.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="business-outline"
                title={debouncedSearch ? 'No buildings found' : 'No buildings yet'}
                description={debouncedSearch ? 'Try a different search term.' : 'Add your first building to get started.'}
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

  // Search
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
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
  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingName: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
  buildingCode: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
  typeBadge: {
    backgroundColor: c.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeText: { fontSize: 10, color: c.textSecondary, fontWeight: Typography.fontWeightMedium, textTransform: 'capitalize' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  locationText: { fontSize: Typography.fontSizeXs, color: c.textMuted, flex: 1 },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.borderLight },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: c.text },
  statLabel: { fontSize: 10, color: c.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: c.borderLight },

  occupancyRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm },
  occupancyLabel: { fontSize: 10, color: c.textMuted },

  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
}
