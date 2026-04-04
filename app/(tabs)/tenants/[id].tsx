import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatRow } from '@/components/ui/StatRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { TENANT_DETAIL_QUERY } from '@/graphql/properties/queries/tenants';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TenantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, loading, error, refetch } = useQuery(TENANT_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const tenant = data?.tenant;

  function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n: string) => n[0] ?? '').join('').toUpperCase();
  }

  const displayName = tenant
    ? tenant.fullName || `${tenant.firstName} ${tenant.lastName}`
    : 'Tenant Detail';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        {tenant && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/tenants/add', params: { id: tenant.id } } as any)}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!tenant && <View style={{ width: 40 }} />}
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState
          title="Failed to load tenant"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {tenant && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(displayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{displayName}</Text>
                {tenant.idNumber ? <Text style={styles.heroSub}>ID: {tenant.idNumber}</Text> : null}
              </View>
              <StatusBadge
                label={tenant.isActive ? 'Active' : 'Inactive'}
                color={tenant.isActive ? 'success' : 'error'}
              />
            </View>
            {(tenant.totalArrears ?? 0) > 0 && (
              <View style={styles.arrearsRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.error} />
                <Text style={styles.arrearsText}>
                  Outstanding arrears: KES {Number(tenant.totalArrears).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Contact */}
          <SectionCard title="Contact">
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={tenant.phone}
              onPress={tenant.phone ? () => Linking.openURL(`tel:${tenant.phone}`) : undefined}
            />
            <InfoRow
              icon="call-outline"
              label="Alternative phone"
              value={tenant.alternativePhone}
              onPress={tenant.alternativePhone ? () => Linking.openURL(`tel:${tenant.alternativePhone}`) : undefined}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={tenant.email}
              onPress={tenant.email ? () => Linking.openURL(`mailto:${tenant.email}`) : undefined}
            />
          </SectionCard>

          {/* Personal */}
          <SectionCard title="Personal">
            <InfoRow icon="briefcase-outline" label="Occupation" value={tenant.occupation} />
            <InfoRow icon="business-outline" label="Employer" value={tenant.employer} />
            <InfoRow icon="home-outline" label="Permanent address" value={tenant.permanentAddress} />
            <InfoRow icon="calendar-outline" label="Default due day" value={tenant.defaultDueDay?.toString()} />
            {tenant.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{tenant.notes}</Text>
              </View>
            ) : null}
          </SectionCard>

          {/* Emergency contact */}
          {(tenant.emergencyContactName || tenant.emergencyContactPhone) && (
            <SectionCard title="Emergency Contact">
              <InfoRow icon="person-outline" label="Name" value={tenant.emergencyContactName} />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={tenant.emergencyContactPhone}
                onPress={tenant.emergencyContactPhone
                  ? () => Linking.openURL(`tel:${tenant.emergencyContactPhone}`)
                  : undefined}
              />
              <InfoRow
                icon="people-outline"
                label="Relationship"
                value={tenant.emergencyContactRelationship}
              />
            </SectionCard>
          )}

          {/* Current occupancies */}
          {tenant.occupancies?.edges?.length > 0 && (
            <SectionCard title="Occupancies">
              {tenant.occupancies.edges.map(({ node }: any) => (
                <View key={`${node.unit?.id}-${node.startDate}`} style={styles.occupancyItem}>
                  <View style={styles.occupancyHeader}>
                    <Text style={styles.unitLabel}>
                      {node.unit?.building?.name} — Unit {node.unit?.unitNumber}
                    </Text>
                    {node.isCurrent && (
                      <StatusBadge label="Current" color="success" />
                    )}
                  </View>
                  <StatRow
                    stats={[
                      { label: 'Rent', value: node.unit?.monthlyRent ? `KES ${Number(node.unit.monthlyRent).toLocaleString()}` : '—' },
                      { label: 'Deposit', value: node.depositPaid ? `KES ${Number(node.depositPaid).toLocaleString()}` : '—' },
                      { label: 'Duration', value: node.durationMonths ? `${Number(node.durationMonths).toFixed(0)} m` : '—' },
                    ]}
                  />
                  <View style={styles.occupancyDates}>
                    <Text style={styles.datesText}>
                      {node.startDate} {node.endDate ? `→ ${node.endDate}` : '(ongoing)'}
                    </Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Rent schedules */}
          {tenant.rentSchedules?.edges?.length > 0 && (
            <SectionCard title="Recent Rent Schedules">
              {tenant.rentSchedules.edges.slice(0, 6).map(({ node }: any) => (
                <View key={node.id} style={styles.scheduleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleUnit}>{node.unit?.unitNumber}</Text>
                    <Text style={styles.scheduleDue}>{node.dueDate}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.scheduleAmount,
                      node.status === 'PAID' ? { color: Colors.success } :
                      node.isOverdue ? { color: Colors.error } :
                      { color: Colors.warning }
                    ]}>
                      KES {Number(node.expectedAmount).toLocaleString()}
                    </Text>
                    <StatusBadge
                      label={node.status}
                      color={node.status === 'PAID' ? 'success' : node.isOverdue ? 'error' : 'warning'}
                    />
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Transactions */}
          {tenant.transactions?.edges?.length > 0 && (
            <SectionCard title="Recent Transactions">
              {tenant.transactions.edges.slice(0, 6).map(({ node }: any) => (
                <View key={node.id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txRef}>#{node.no || node.reference || node.id}</Text>
                    <Text style={styles.txMode}>{node.paymentMode}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: Colors.success }]}>
                      KES {Number(node.amount).toLocaleString()}
                    </Text>
                    <StatusBadge
                      label={node.status}
                      color={node.status === 'CONFIRMED' || node.status === 'COMPLETE' ? 'success' : 'warning'}
                    />
                  </View>
                </View>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.text,
  },
  scroll: { padding: Spacing.md },

  // Hero
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSizeXl,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primary,
  },
  heroName: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, color: Colors.text },
  heroSub: { fontSize: Typography.fontSizeSm, color: Colors.textMuted, marginTop: 2 },
  arrearsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  arrearsText: { fontSize: Typography.fontSizeSm, color: Colors.error, fontWeight: Typography.fontWeightMedium },

  notesBox: { paddingTop: Spacing.xs },
  notesLabel: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, marginBottom: 2 },
  notesText: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, lineHeight: 20 },

  occupancyItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  occupancyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  unitLabel: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: Colors.text, flex: 1 },
  occupancyDates: { marginTop: Spacing.xs },
  datesText: { fontSize: Typography.fontSizeXs, color: Colors.textMuted },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  scheduleUnit: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: Colors.text },
  scheduleDue: { fontSize: Typography.fontSizeXs, color: Colors.textMuted },
  scheduleAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, marginBottom: 2 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  txRef: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: Colors.text },
  txMode: { fontSize: Typography.fontSizeXs, color: Colors.textMuted },
  txAmount: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, marginBottom: 2 },
});
