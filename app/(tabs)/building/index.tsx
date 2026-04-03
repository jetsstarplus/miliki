import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
import { AppHeader } from '@/components/AppHeader';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { BUILDING_LIST } from '@/graphql/properties/queries/building';

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

function OccupancyBar({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.max(0, rate ?? 0));
  const color = pct >= 80 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 2 },
});

function BuildingCard({ building }: { building: Building }) {
  const router = useRouter();
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
          <Ionicons name="business" size={22} color={Colors.primary} />
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
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
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
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const { data, loading, error, refetch } = useQuery(BUILDING_LIST, {
    fetchPolicy: 'cache-and-network',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const buildings: Building[] =
    data?.buildings?.edges?.map((e: any) => e.node) ?? [];

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
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {error && !data && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Failed to load buildings</Text>
          <Text style={styles.errorSub}>{error.message}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <FlatList
          data={buildings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <BuildingCard building={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={52} color={Colors.primary} style={{ opacity: 0.3 }} />
                <Text style={styles.emptyTitle}>No buildings yet</Text>
                <Text style={styles.emptyText}>Add your first building to get started.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  card: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingName: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: Colors.text },
  buildingCode: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, marginTop: 1 },
  typeBadge: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeText: { fontSize: 10, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium, textTransform: 'capitalize' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  locationText: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, flex: 1 },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.borderLight },

  occupancyRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm },
  occupancyLabel: { fontSize: 10, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },

  errorText: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginTop: Spacing.md },
  errorSub: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md },
  retryText: { color: '#fff', fontWeight: Typography.fontWeightSemibold },

  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
