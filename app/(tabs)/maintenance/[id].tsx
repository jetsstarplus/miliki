import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATEUPDATEMAINTENANCE, DELETEMAINTENANCE } from '@/graphql/properties/mutations/maintenance';
import { MAINTENANCE, MAINTENANCES } from '@/graphql/properties/queries/maintenance';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function MaintenanceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading, error, refetch } = useQuery(MAINTENANCE, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const request = data?.maintenanceRequest;

  const [updateStatus, { loading: updating }] = useMutation(CREATEUPDATEMAINTENANCE, {
    refetchQueries: [{ query: MAINTENANCE, variables: { id } }, { query: MAINTENANCES }],
    onCompleted(d: any) {
      const r = d?.createUpdateMaintenanceRequest;
      if (!r?.success) Alert.alert('Error', r?.message ?? 'Failed to update status');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  const [deleteRequest, { loading: deleting }] = useMutation(DELETEMAINTENANCE, {
    refetchQueries: [{ query: MAINTENANCES }],
    onCompleted(d: any) {
      const r = d?.deleteMaintenanceRequest;
      if (r?.success) router.back();
      else Alert.alert('Error', r?.message ?? 'Failed to delete request');
    },
    onError(err: any) { Alert.alert('Error', err.message); },
  });

  function confirmSetStatus(status: string) {
    Alert.alert(
      'Update Status',
      `Change status to "${status.replace(/_/g, ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            updateStatus({
              variables: {
                id,
                buildingId: request.building?.id,
                title: request.title,
                status,
              },
            }),
        },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert('Delete Request', 'Delete this maintenance request? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRequest({ variables: { id } }) },
    ]);
  }

  const priorityColor = PRIORITY_COLORS[request?.priority] ?? colors.textMuted;
  const statusColor = STATUS_COLORS[request?.status] ?? colors.textMuted;

  const NEXT_STATUSES = [
    { status: 'TRIAGE', label: 'Triage', icon: 'search-outline' },
    { status: 'SCHEDULED', label: 'Schedule', icon: 'calendar-outline' },
    { status: 'IN_PROGRESS', label: 'Start', icon: 'play-circle-outline' },
    { status: 'ON_HOLD', label: 'Hold', icon: 'pause-circle-outline' },
    { status: 'COMPLETED', label: 'Complete', icon: 'checkmark-circle-outline' },
    { status: 'CANCELLED', label: 'Cancel', icon: 'close-circle-outline' },
  ].filter(s => s.status !== request?.status);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {request?.title ?? 'Maintenance Request'}
        </Text>
        {request ? (
          <TouchableOpacity
            style={styles.backBtn}
            hitSlop={8}
            onPress={() => router.push({ pathname: '/(tabs)/maintenance/add', params: { requestId: id } } as any)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading && !data && <LoadingState />}

      {error && !data && (
        <ErrorState title="Failed to load request" message={error.message} onRetry={() => refetch()} />
      )}

      {request && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{request.title}</Text>
                {request.building?.name ? (
                  <Text style={styles.heroSub}>
                    {request.building.name}
                    {request.unit?.description ? ` · Unit ${request.unit.description}` : ''}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {(request.status ?? '').replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.metaChip}>
                <Ionicons name="pricetag-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{request.category?.replace(/_/g, ' ') ?? '—'}</Text>
              </View>
              <View style={[styles.metaChip, { borderColor: priorityColor + '66' }]}>
                <Ionicons name="alert-circle-outline" size={12} color={priorityColor} />
                <Text style={[styles.metaText, { color: priorityColor }]}>{request.priority}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {request.description ? (
            <SectionCard title="Description">
              <Text style={styles.description}>{request.description}</Text>
            </SectionCard>
          ) : null}

          {/* Location & People */}
          <SectionCard title="Location & People">
            <InfoRow icon="business-outline" label="Building" value={request.building?.name} />
            <InfoRow icon="home-outline" label="Unit" value={request.unit?.description} />
            <InfoRow icon="person-outline" label="Tenant" value={request.tenant?.fullName} />
          </SectionCard>

          {/* Scheduling */}
          <SectionCard title="Scheduling">
            <InfoRow icon="calendar-outline" label="Requested Date" value={fmt(request.requestedDate)} />
            <InfoRow icon="calendar-number-outline" label="Scheduled Date" value={fmt(request.scheduledDate)} />
            <InfoRow icon="checkmark-done-circle-outline" label="Resolved Date" value={fmt(request.resolvedDate)} />
            <InfoRow icon="timer-outline" label="SLA Hours" value={request.slaHours ? `${request.slaHours}h` : null} />
          </SectionCard>

          {/* Assignment & Costs */}
          <SectionCard title="Assignment & Costs">
            <InfoRow icon="person-circle-outline" label="Assigned To" value={request.assignedTo?.searchName} />
            <InfoRow icon="storefront-outline" label="Vendor" value={request.vendorName} />
            <InfoRow
              icon="analytics-outline"
              label="Estimated Cost"
              value={request.estimatedCost != null ? `KES ${Number(request.estimatedCost).toLocaleString()}` : null}
            />
            <InfoRow
              icon="cash-outline"
              label="Actual Cost"
              value={request.actualCost != null ? `KES ${Number(request.actualCost).toLocaleString()}` : null}
            />
            {request.tenantImpact ? (
              <InfoRow icon="people-outline" label="Tenant Impact" value="Yes" />
            ) : null}
          </SectionCard>

          {/* Change Status */}
          <SectionCard title="Change Status">
            <View style={styles.actionsGrid}>
              {NEXT_STATUSES.map(s => (
                <TouchableOpacity
                  key={s.status}
                  style={[styles.statusBtn, updating && styles.statusBtnDisabled]}
                  onPress={() => confirmSetStatus(s.status)}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Ionicons name={s.icon as any} size={16} color={colors.primary} />
                  <Text style={styles.statusBtnText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard title="Danger Zone">
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Request'}</Text>
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
    priorityBar: { width: 4, height: 44, borderRadius: 2 },
    heroTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold, color: c.text },
    heroSub: { fontSize: Typography.fontSizeSm, color: c.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    statusText: { fontSize: 11, fontWeight: '600' },
    heroMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },
    description: { fontSize: Typography.fontSizeSm, color: c.textSecondary, lineHeight: 20 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    statusBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.primary + '55',
      backgroundColor: c.overlay,
    },
    statusBtnDisabled: { opacity: 0.5 },
    statusBtnText: { fontSize: Typography.fontSizeSm, color: c.primary, fontWeight: '500' },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.error + '44',
      backgroundColor: Colors.error + '0A',
    },
    deleteBtnText: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: Colors.error,
    },
  });
}
