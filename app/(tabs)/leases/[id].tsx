import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { ACTIVATE_LEASE, DELETE_LEASE, TERMINATE_LEASE } from '@/graphql/properties/mutations/leases';
import { LEASE_DETAIL, LEASE_LIST } from '@/graphql/properties/queries/leases';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: Colors.success,
  DRAFT: '#6B7280',
  EXPIRED: Colors.warning,
  TERMINATED: Colors.error,
  RENEWED: '#3B82F6',
};

function fmt(d: string | null | undefined) {
  if (!d) return null;
  try {
    const parts = d.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtCurrency(v: number | null | undefined) {
  if (v == null) return null;
  return `KES ${Number(v).toLocaleString()}`;
}

export default function LeaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading, error, refetch } = useQuery(LEASE_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const lease = data?.lease;

  const [activateLease, { loading: activating }] = useMutation(ACTIVATE_LEASE, {
    refetchQueries: [{ query: LEASE_DETAIL, variables: { id } }, { query: LEASE_LIST }],
    onCompleted(d: any) {
      const r = d?.activateLease;
      if (!r?.success) Alert.alert('Error', r?.message ?? 'Failed to activate lease');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [terminateLease, { loading: terminating }] = useMutation(TERMINATE_LEASE, {
    refetchQueries: [{ query: LEASE_DETAIL, variables: { id } }, { query: LEASE_LIST }],
    onCompleted(d: any) {
      const r = d?.terminateLease;
      if (!r?.success) Alert.alert('Error', r?.message ?? 'Failed to terminate lease');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [deleteLease, { loading: deleting }] = useMutation(DELETE_LEASE, {
    refetchQueries: [{ query: LEASE_LIST }],
    onCompleted(d: any) {
      const r = d?.deleteLease;
      if (r?.success) router.back();
      else Alert.alert('Error', r?.message ?? 'Failed to delete lease');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  function confirmActivate() {
    Alert.alert('Activate Lease', 'Activate this lease?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: () => activateLease({ variables: { id } }) },
    ]);
  }

  function confirmTerminate() {
    Alert.alert('Terminate Lease', 'Terminate this lease? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Terminate', style: 'destructive', onPress: () => terminateLease({ variables: { id } }) },
    ]);
  }

  function confirmDelete() {
    Alert.alert('Delete Lease', 'Delete this lease? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLease({ variables: { id } }) },
    ]);
  }

  const statusColor = STATUS_COLORS[lease?.status] ?? colors.textMuted;
  const tenant = lease?.occupancy?.tenant;
  const unit = lease?.occupancy?.unit;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lease?.leaseNumber ?? 'Lease Detail'}
        </Text>
        {lease ? (
          <TouchableOpacity
            style={styles.backBtn}
            hitSlop={8}
            onPress={() => router.push({ pathname: '/(tabs)/leases/add', params: { leaseId: id } } as any)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState title="Failed to load lease" message={error.message} onRetry={() => refetch()} />
      )}

      {lease && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="document-text" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{lease.leaseNumber ?? `Lease #${id}`}</Text>
                {tenant?.fullName ? (
                  <Text style={styles.heroSub} numberOfLines={1}>{tenant.fullName}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{lease.status}</Text>
              </View>
            </View>
            {unit && (
              <View style={styles.unitRow}>
                <Ionicons name="home-outline" size={13} color={colors.textMuted} />
                <Text style={styles.unitText}>
                  Unit {unit.unitNumber}
                  {unit.unitType?.name ? ` · ${unit.unitType.name}` : ''}
                  {unit.accountNumber ? ` · ${unit.accountNumber}` : ''}
                </Text>
              </View>
            )}
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{(lease.leaseType ?? '').replace(/_/g, ' ')}</Text>
            </View>
          </View>

          {/* Financials */}
          <SectionCard title="Financials">
            <InfoRow icon="cash-outline" label="Rent Amount" value={fmtCurrency(lease.rentAmount)} />
            <InfoRow icon="wallet-outline" label="Deposit" value={fmtCurrency(lease.depositAmount)} />
            <InfoRow icon="pricetag-outline" label="Service Charge" value={fmtCurrency(lease.serviceCharge)} />
            <InfoRow icon="repeat-outline" label="Payment Frequency" value={lease.paymentFrequency} />
            <InfoRow icon="calendar-number-outline" label="Payment Due Day" value={lease.paymentDueDay ? `Day ${lease.paymentDueDay}` : null} />
            <InfoRow icon="trending-up-outline" label="Escalation Rate" value={lease.rentEscalationRate ? `${lease.rentEscalationRate}%` : null} />
            <InfoRow icon="calendar-outline" label="Next Escalation" value={fmt(lease.nextEscalationDate)} />
          </SectionCard>

          {/* Dates */}
          <SectionCard title="Dates">
            <InfoRow icon="play-circle-outline" label="Start Date" value={fmt(lease.startDate)} />
            <InfoRow icon="stop-circle-outline" label="End Date" value={lease.endDate ? fmt(lease.endDate) : 'Open-ended'} />
            <InfoRow icon="checkmark-circle-outline" label="Signed Date" value={fmt(lease.signedDate)} />
          </SectionCard>

          {/* Options */}
          <SectionCard title="Options">
            {lease.latePaymentPenalty ? (
              <InfoRow icon="alert-circle-outline" label="Late Payment Penalty" value="Enabled" />
            ) : null}
            {lease.renewalOption ? (
              <InfoRow icon="refresh-circle-outline" label="Renewal Option" value="Available" />
            ) : null}
            <InfoRow icon="document-outline" label="Special Conditions" value={lease.specialConditions} />
            <InfoRow icon="lock-closed-outline" label="Internal Notes" value={lease.internalNotes} />
          </SectionCard>

          {/* Occupancy */}
          {lease.occupancy && (
            <SectionCard title="Occupancy">
              <InfoRow icon="calendar-outline" label="Move-in Date" value={fmt(lease.occupancy.startDate)} />
              <InfoRow icon="calendar-outline" label="Move-out Date" value={fmt(lease.occupancy.endDate)} />
              <InfoRow icon="cash-outline" label="Deposit Paid" value={lease.occupancy.depositPaid ? 'Yes' : null} />
              <InfoRow icon="checkmark-done-outline" label="Deposit Refunded" value={lease.occupancy.depositRefunded ? 'Yes' : null} />
              <InfoRow icon="information-circle-outline" label="Move-out Reason" value={lease.occupancy.moveOutReason} />
              <InfoRow icon="document-outline" label="Notes" value={lease.occupancy.notes} />
            </SectionCard>
          )}

          {/* Actions */}
          <SectionCard title="Actions">
            {lease.status === 'DRAFT' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.activateBtn]}
                onPress={confirmActivate}
                disabled={activating}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{activating ? 'Activating…' : 'Activate Lease'}</Text>
              </TouchableOpacity>
            )}
            {(lease.status === 'ACTIVE' || lease.status === 'EXPIRED') && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.renewBtn]}
                onPress={() => router.push({ pathname: '/(tabs)/leases/add', params: { leaseId: id, renew: '1' } } as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Renew Lease</Text>
              </TouchableOpacity>
            )}
            {lease.status === 'ACTIVE' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.terminateBtn]}
                onPress={confirmTerminate}
                disabled={terminating}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                  {terminating ? 'Terminating…' : 'Terminate Lease'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                {deleting ? 'Deleting…' : 'Delete Lease'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

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
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    scroll: { padding: Spacing.md },
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
    heroSub: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusText: { fontSize: 11, fontWeight: '600' },
    unitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
    unitText: { fontSize: Typography.fontSizeSm, color: c.textSecondary },
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: c.borderLight,
      borderRadius: Radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: Spacing.sm,
    },
    typeText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightMedium,
      textTransform: 'capitalize',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 48,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
    },
    activateBtn: { backgroundColor: c.primary },
    renewBtn: { borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.overlay },
    terminateBtn: { borderWidth: 1.5, borderColor: Colors.error + '44', backgroundColor: Colors.error + '0A' },
    deleteBtn: { borderWidth: 1.5, borderColor: Colors.error + '44', backgroundColor: Colors.error + '0A' },
    actionBtnText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: '#fff',
    },
  });
}
