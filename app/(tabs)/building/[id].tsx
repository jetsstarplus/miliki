import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { BUILDING_DETAIL } from '@/graphql/properties/queries/building';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.borderLight, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 3 },
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string | null;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && { color: Colors.primary }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />}
    </TouchableOpacity>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function BuildingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, loading, error, refetch } = useQuery(BUILDING_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const building = data?.oneBuilding;

  const typeLabel = building?.buildingType
    ? building.buildingType.replace(/_/g, ' ')
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {building?.name ?? 'Building Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading */}
      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Error */}
      {error && !data && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Failed to load building</Text>
          <Text style={styles.errorSub}>{error.message}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {building && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="business" size={28} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{building.name}</Text>
                {building.code ? (
                  <Text style={styles.heroCode}>{building.code}</Text>
                ) : null}
              </View>
              {building.isActive !== undefined && (
                <View style={[styles.statusBadge, building.isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, building.isActive ? { color: Colors.success } : { color: Colors.error }]}>
                    {building.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              )}
            </View>
            {typeLabel && (
              <View style={styles.typeBadge}>
                <Ionicons name="layers-outline" size={12} color={Colors.primary} />
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <SectionCard title="Occupancy">
            <View style={styles.statsRow}>
              <StatBox label="Total Units" value={building.totalUnits ?? '—'} />
              <View style={styles.statDivider} />
              <StatBox label="Occupied" value={building.occupiedUnitsCount ?? '—'} color={Colors.success} />
              <View style={styles.statDivider} />
              <StatBox label="Vacant" value={building.vacantUnitsCount ?? '—'} color={Colors.warning} />
              <View style={styles.statDivider} />
              <StatBox label="Floors" value={building.numberOfFloors ?? '—'} />
            </View>
            <View style={styles.occupancyMeta}>
              <Text style={styles.occupancyPct}>
                {(building.occupancyRate ?? 0).toFixed(0)}% occupancy
              </Text>
            </View>
            <OccupancyBar rate={building.occupancyRate ?? 0} />
          </SectionCard>

          {/* Location */}
          <SectionCard title="Location">
            <InfoRow icon="location-outline" label="Address" value={building.address} />
            <InfoRow icon="map-outline" label="City" value={building.city} />
            <InfoRow icon="globe-outline" label="County" value={building.county} />
            {building.latitude && building.longitude && (
              <InfoRow
                icon="navigate-outline"
                label="Coordinates"
                value={`${building.latitude}, ${building.longitude}`}
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${building.latitude},${building.longitude}`
                  )
                }
              />
            )}
          </SectionCard>

          {/* Overview */}
          <SectionCard title="Overview">
            <InfoRow icon="calendar-outline" label="Year Built" value={building.yearBuilt?.toString()} />
            <InfoRow icon="pricetag-outline" label="Building Type" value={typeLabel} />
            {building.totalMonthlyRent != null && (
              <InfoRow
                icon="cash-outline"
                label="Total Monthly Rent"
                value={`KES ${Number(building.totalMonthlyRent).toLocaleString()}`}
              />
            )}
            {building.createdBy?.searchName && (
              <InfoRow icon="person-outline" label="Created By" value={building.createdBy.searchName} />
            )}
          </SectionCard>

          {/* Manager */}
          {(building.managerName || building.managerPhone || building.managerEmail) && (
            <SectionCard title="Property Manager">
              <InfoRow icon="person-circle-outline" label="Name" value={building.managerName} />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={building.managerPhone}
                onPress={building.managerPhone ? () => Linking.openURL(`tel:${building.managerPhone}`) : undefined}
              />
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={building.managerEmail}
                onPress={building.managerEmail ? () => Linking.openURL(`mailto:${building.managerEmail}`) : undefined}
              />
            </SectionCard>
          )}

          {/* Description */}
          {building.description ? (
            <SectionCard title="Description">
              <Text style={styles.description}>{building.description}</Text>
            </SectionCard>
          ) : null}

          {/* Documents */}
          {building.documents?.edges?.length > 0 && (
            <SectionCard title="Documents">
              {building.documents.edges.map(({ node }: any) => (
                <TouchableOpacity
                  key={node.id}
                  style={styles.docRow}
                  onPress={() => Linking.openURL(node.fileUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-outline" size={18} color={Colors.primary} />
                  <Text style={styles.docText} numberOfLines={1}>
                    {node.fileUrl.split('/').pop() ?? 'Document'}
                  </Text>
                  <Ionicons name="download-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </SectionCard>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.text,
  },

  scroll: { padding: Spacing.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginTop: Spacing.md },
  errorSub: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md },
  retryText: { color: '#fff', fontWeight: Typography.fontWeightSemibold },

  // Hero
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: Colors.text },
  heroCode: { fontSize: Typography.fontSizeSm, color: Colors.textMuted, marginTop: 2 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: Spacing.sm,
  },
  typeText: { fontSize: 11, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium, textTransform: 'capitalize' },
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.1)' },
  statusInactive: { backgroundColor: 'rgba(239,68,68,0.1)' },
  statusText: { fontSize: 11, fontWeight: Typography.fontWeightSemibold },

  // Section card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.borderLight },
  occupancyMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm },
  occupancyPct: { fontSize: Typography.fontSizeXs, color: Colors.textMuted },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: Typography.fontSizeXs, color: Colors.textMuted },
  infoValue: { fontSize: Typography.fontSizeSm, color: Colors.text, fontWeight: Typography.fontWeightMedium, marginTop: 1 },

  // Description
  description: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, lineHeight: 20 },

  // Documents
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  docText: { flex: 1, fontSize: Typography.fontSizeSm, color: Colors.primary },
});
