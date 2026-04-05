import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { UNIT_DETAIL_QUERY } from '@/graphql/properties/queries/units';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UnitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading, error, refetch } = useQuery(UNIT_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const unit = data?.unit;
  const displayName = unit ? `Unit ${unit.unitNumber}` : 'Unit Detail';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        {unit ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/units/add', params: { unitId: unit.id } } as any)}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading && !data && <LoadingState />}
      {error && !data && (
        <ErrorState title="Failed to load unit" message={error.message} onRetry={() => refetch()} />
      )}

      {unit && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="home-outline" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{displayName}</Text>
                {unit.building?.name ? (
                  <Text style={styles.heroSub}>{unit.building.name}</Text>
                ) : null}
              </View>
              <StatusBadge
                label={(unit.status || 'Occupied')}
                color={unit.isAvailableForRent ? 'success' : 'error'}
              />
            </View>
            {(unit.arrears ?? 0) > 0 && (
              <View style={styles.arrearsRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.error} />
                <Text style={styles.arrearsText}>
                  Outstanding arrears: KES {Number(unit.arrears).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Unit info */}
          <SectionCard title="Unit info">
            <InfoRow icon="key-outline" label="Unit number" value={unit.unitNumber} />
            <InfoRow icon="document-text-outline" label="Account number" value={unit.accountNumber} />
            <InfoRow icon="barcode-outline" label="Unique account no." value={unit.uniqueAccountNumber} />
            <InfoRow icon="layers-outline" label="Floor" value={unit.floor} />
            <InfoRow icon="grid-outline" label="Unit type" value={unit.unitTypeLegacy} />
            <InfoRow icon="bed-outline" label="Bedrooms" value={unit.bedrooms != null ? String(unit.bedrooms) : null} />
            <InfoRow icon="water-outline" label="Bathrooms" value={unit.bathrooms != null ? String(unit.bathrooms) : null} />
            <InfoRow icon="resize-outline" label="Square feet" value={unit.squareFeet ? `${unit.squareFeet} sqft` : null} />
          </SectionCard>

          {/* Financial summary stats */}
          <SectionCard title="Financial">
            <StatRow
              stats={[
                { label: 'Monthly Rent', value: `KES ${Number(unit.monthlyRent ?? 0).toLocaleString()}` },
                { label: 'Deposit', value: `KES ${Number(unit.depositAmount ?? 0).toLocaleString()}` },
              ]}
            />
            {(unit.serviceCharge ?? 0) > 0 || unit.purchasePrice ? (
              <View style={{ marginTop: Spacing.sm }}>
                <StatRow
                  stats={[
                    ...(unit.serviceCharge > 0
                      ? [{ label: 'Service Charge', value: `KES ${Number(unit.serviceCharge).toLocaleString()}` }]
                      : []),
                    ...(unit.purchasePrice
                      ? [{ label: 'Purchase Price', value: `KES ${Number(unit.purchasePrice).toLocaleString()}` }]
                      : []),
                  ]}
                />
              </View>
            ) : null}
            {(unit.currentBalance ?? 0) !== 0 ? (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current balance</Text>
                <Text style={[
                  styles.balanceValue,
                  { color: (unit.currentBalance ?? 0) >= 0 ? Colors.success : Colors.error },
                ]}>
                  KES {Number(unit.currentBalance).toLocaleString()}
                </Text>
              </View>
            ) : null}
            <InfoRow icon="refresh-outline" label="Payment period" value={unit.paymentPeriod} />
          </SectionCard>

          {/* Availability */}
          <SectionCard title="Availability">
            <InfoRow
              icon="checkmark-circle-outline"
              label="Available for rent"
              value={unit.isAvailableForRent ? 'Yes' : 'No'}
            />
            <InfoRow
              icon="cart-outline"
              label="Available for purchase"
              value={unit.isAvailableForPurchase ? 'Yes' : 'No'}
            />
          </SectionCard>

          {/* Occupancies */}
          {(unit.occupancies?.edges?.length ?? 0) > 0 && (
            <SectionCard title="Occupancies">
              {unit.occupancies.edges.slice(0, 5).map(({ node: occ }: any, i: number) => (
                <View key={i} style={styles.occupancyItem}>
                  <View style={styles.occupancyRow}>
                    <Text style={styles.tenantName}>{occ.tenant?.fullName ?? '—'}</Text>
                    {occ.isCurrent ? <StatusBadge label="Current" color="success" /> : null}
                  </View>
                  {occ.tenant?.phone ? <Text style={styles.subText}>{occ.tenant.phone}</Text> : null}
                  <StatRow
                    stats={[
                      { label: 'Deposit Paid', value: `KES ${Number(occ.depositPaid ?? 0).toLocaleString()}` },
                      { label: 'Duration', value: occ.durationMonths ? `${occ.durationMonths}mo` : '—' },
                    ]}
                  />
                  <Text style={styles.dateRange}>
                    {occ.startDate ?? '—'} → {occ.endDate ?? 'Present'}
                  </Text>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Rent Schedules */}
          {(unit.rentSchedules?.edges?.length ?? 0) > 0 && (
            <SectionCard title="Rent Schedules">
              {unit.rentSchedules.edges.slice(0, 6).map(({ node: rs }: any, i: number) => (
                <View key={i} style={styles.scheduleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleDate}>{rs.periodStart} – {rs.periodEnd}</Text>
                    <Text style={styles.subText}>Due: {rs.dueDate}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.scheduleAmount, rs.isOverdue && { color: Colors.error }]}>
                      KES {Number(rs.rentAmount ?? 0).toLocaleString()}
                    </Text>
                    <StatusBadge
                      label={rs.status ?? 'PENDING'}
                      color={rs.status === 'PAID' ? 'success' : rs.isOverdue ? 'error' : 'warning'}
                    />
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Purchase Agreements */}
          {(unit.purchaseAgreements?.edges?.length ?? 0) > 0 && (
            <SectionCard title="Purchase Agreements">
              {unit.purchaseAgreements.edges.map(({ node: pa }: any, i: number) => (
                <View key={i} style={styles.scheduleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleDate}>{pa.buyer?.fullName ?? '—'}</Text>
                    {pa.agreementNumber ? <Text style={styles.subText}>Ref: {pa.agreementNumber}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.scheduleAmount}>
                      KES {Number(pa.totalPrice ?? 0).toLocaleString()}
                    </Text>
                    <StatusBadge label={pa.status ?? 'UNKNOWN'} color="info" />
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  scroll: { padding: Spacing.md, paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
  },
  heroCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold, color: c.text },
  heroSub: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
  arrearsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  arrearsText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.error,
    fontWeight: Typography.fontWeightMedium,
    flex: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  balanceLabel: { fontSize: Typography.fontSizeSm, color: c.textMuted },
  balanceValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold },
  occupancyItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    marginBottom: Spacing.xs,
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  tenantName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
    flex: 1,
  },
  subText: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: Spacing.xs },
  dateRange: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: Spacing.xs },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    gap: Spacing.sm,
  },
  scheduleDate: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },
  scheduleAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold, color: c.text },
  });
}
