import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { OccupancyBar } from '@/components/ui/OccupancyBar';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { BUILDING_DETAIL } from '@/graphql/properties/queries/building';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BuildingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {building?.name ?? 'Building Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState
          title="Failed to load building"
          message={error.message}
          onRetry={() => refetch()}
        />
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
                <Ionicons name="business" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{building.name}</Text>
                {building.code ? (
                  <Text style={styles.heroCode}>{building.code}</Text>
                ) : null}
              </View>
              {building.isActive !== undefined && (
                <StatusBadge
                  label={building.isActive ? 'Active' : 'Inactive'}
                  color={building.isActive ? 'success' : 'error'}
                />
              )}
            </View>
            {typeLabel && (
              <View style={styles.typeBadge}>
                <Ionicons name="layers-outline" size={12} color={colors.primary} />
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <SectionCard title="Occupancy">
            <StatRow
              stats={[
                { label: 'Total Units', value: building.totalUnits ?? '—' },
                { label: 'Occupied', value: building.occupiedUnitsCount ?? '—', color: Colors.success },
                { label: 'Vacant', value: building.vacantUnitsCount ?? '—', color: Colors.warning },
                { label: 'Floors', value: building.numberOfFloors ?? '—' },
              ]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm }}>
              <Text style={{ fontSize: Typography.fontSizeXs, color: colors.textMuted }}>
                {(building.occupancyRate ?? 0).toFixed(0)}% occupancy
              </Text>
            </View>
            <OccupancyBar rate={building.occupancyRate ?? 0} height={6} />
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
                  <Ionicons name="document-outline" size={18} color={colors.primary} />
                  <Text style={styles.docText} numberOfLines={1}>
                    {node.fileUrl.split('/').pop() ?? 'Document'}
                  </Text>
                  <Ionicons name="download-outline" size={16} color={colors.textMuted} />
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
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
    color: c.text,
  },

  scroll: { padding: Spacing.md },

  // Hero
  heroCard: {
    backgroundColor: c.surface,
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
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: c.text },
  heroCode: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: c.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: Spacing.sm,
  },
  typeText: { fontSize: 11, color: c.textSecondary, fontWeight: Typography.fontWeightMedium, textTransform: 'capitalize' },
  // Description
  description: { fontSize: Typography.fontSizeSm, color: c.textSecondary, lineHeight: 20 },

  // Documents
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  docText: { flex: 1, fontSize: Typography.fontSizeSm, color: c.primary },
  });
}
