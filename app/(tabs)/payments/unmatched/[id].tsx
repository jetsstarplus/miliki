import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { RECONCILE_GATEWAY_BUFFER } from '@/graphql/properties/mutations/payments';
import {
  GATEWAY_BUFFER_DETAIL,
  UNRECONCILED_GATEWAY_BUFFERS_QUERY,
} from '@/graphql/properties/queries/payments';
import { TENANTS_DROPDOWN } from '@/graphql/properties/queries/tenants';
import { UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatAmount(v: number | null | undefined, currency = 'KES') {
  if (v == null) return null;
  return `${currency} ${Number(v).toLocaleString()}`;
}

export default function GatewayBufferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Reconcile form state
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitDisplay, setUnitDisplay] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantDisplay, setTenantDisplay] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [unitError, setUnitError] = useState('');

  const { data, loading, error, refetch } = useQuery(GATEWAY_BUFFER_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
    skip: !id,
  });

  const { data: unitsData, loading: unitsLoading } = useQuery(UNITS_DROPDOWN, {
    variables: { first: 50, search: unitSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const { data: tenantsData, loading: tenantsLoading } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 100, search: tenantSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const unitOptions: DropdownOption[] = useMemo(() => {
    const edges: any[] = unitsData?.units?.edges ?? [];
    const occupied = edges.filter((e: any) =>
      e.node.occupancies?.edges?.some((oe: any) => oe.node.isCurrent)
    );
    const filtered = selectedTenantId
      ? occupied.filter((e: any) =>
          e.node.occupancies?.edges?.some(
            (oe: any) => oe.node.isCurrent && oe.node.tenant?.id === selectedTenantId
          )
        )
      : occupied;
    return filtered.map((e: any) => ({
      id: e.node.id,
      label: e.node.unitNumber,
      sublabel: e.node.building?.name ?? undefined,
    }));
  }, [unitsData, selectedTenantId]);

  const tenantOptions: DropdownOption[] = useMemo(
    () =>
      (tenantsData?.tenants?.edges ?? []).map((e: any) => ({
        id: e.node.id,
        label: e.node.fullName,
        sublabel: e.node.phone ?? undefined,
      })),
    [tenantsData]
  );

  function handleUnitSelect(opt: DropdownOption) {
    setSelectedUnitId(opt.id);
    setUnitDisplay(opt.label + (opt.sublabel ? ` · ${opt.sublabel}` : ''));
    setUnitError('');
    // Auto-fill tenant from the unit's current occupant
    const unitNode = (unitsData?.units?.edges ?? []).find((e: any) => e.node.id === opt.id)?.node;
    const currentOcc = unitNode?.occupancies?.edges?.find((oe: any) => oe.node.isCurrent);
    if (currentOcc?.node?.tenant) {
      setSelectedTenantId(currentOcc.node.tenant.id);
      setTenantDisplay(currentOcc.node.tenant.fullName);
    }
  }

  function handleTenantSelect(opt: DropdownOption) {
    setSelectedTenantId(opt.id);
    setTenantDisplay(opt.label);
    // Auto-fill unit from the tenant's current occupancy
    const tenantNode = (tenantsData?.tenants?.edges ?? []).find((e: any) => e.node.id === opt.id)?.node;
    const currentOcc = tenantNode?.occupancies?.edges?.find((oe: any) => oe.node.isCurrent);
    if (currentOcc?.node?.unit) {
      const u = currentOcc.node.unit;
      setSelectedUnitId(u.id);
      setUnitDisplay(u.unitNumber + (u.building?.name ? ` · ${u.building.name}` : ''));
      setUnitError('');
    }
  }

  const [reconcile, { loading: reconciling }] = useMutation(RECONCILE_GATEWAY_BUFFER, {
    refetchQueries: [{ query: UNRECONCILED_GATEWAY_BUFFERS_QUERY, variables: { first: 20 } }],
    onCompleted(d: any) {
      const r = d?.reconcileGatewayBuffer;
      const txNo = r?.transaction?.no ?? '';
      Alert.alert(
        'Reconciled',
        r?.message ?? `Payment reconciled${txNo ? ` as transaction ${txNo}` : ''}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError(err: any) {
      Alert.alert('Error', err.message);
    },
  });

  function submitReconcile() {
    if (!selectedUnitId) {
      setUnitError('Please select a unit to reconcile against.');
      return;
    }
    setUnitError('');
    const buffer = data?.gatewayBuffer;
    Alert.alert(
      'Reconcile Payment',
      `Reconcile ${formatAmount(buffer?.amount, buffer?.currency ?? 'KES')} from ${buffer?.payerName ?? 'unknown'} to unit ${unitDisplay}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconcile',
          onPress: () =>
            reconcile({
              variables: {
                gatewayBufferId: id,
                unitId: selectedUnitId,
                tenantId: selectedTenantId || undefined,
              },
            }),
        },
      ]
    );
  }

  if (loading && !data) return <LoadingState />;
  if (error && !data)
    return <ErrorState title="Failed to load payment" message={error.message} onRetry={refetch} />;

  const buffer = data?.gatewayBuffer;
  const lines: { id: string; amount: number; paymentTypeName: string }[] = buffer?.lines?.edges?.map(
    (e: any) => e.node
  ) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {buffer?.reference ?? 'Payment Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {buffer ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="swap-horizontal" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.heroRef}>{buffer.reference ?? `Buffer #${id}`}</Text>
                <Text style={styles.heroSub}>{buffer.payerName ?? '—'}</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>
              {formatAmount(buffer.amount, buffer.currency ?? 'KES')}
            </Text>
          </View>

          {/* Payment Info */}
          <SectionCard title="Payment Info">
            <InfoRow icon="calendar-outline" label="Payment Date" value={formatDate(buffer.paymentDate)} />
            <InfoRow icon="call-outline" label="Payer Phone" value={buffer.payerPhone} />
            <InfoRow icon="layers-outline" label="Source" value={buffer.source} />
          </SectionCard>

          {/* Reference Numbers */}
          <SectionCard title="References">
            {buffer.externalReference ? (
              <InfoRow icon="barcode-outline" label="External Reference" value={buffer.externalReference} />
            ) : null}
            {buffer.invoiceNumber ? (
              <InfoRow icon="document-outline" label="Invoice Number" value={buffer.invoiceNumber} />
            ) : null}
            {buffer.sourceDocumentNumber ? (
              <InfoRow icon="file-tray-outline" label="Source Document No." value={buffer.sourceDocumentNumber} />
            ) : null}
          </SectionCard>

          {/* Allocation Lines */}
          {lines.length > 0 && (
            <SectionCard title={`Allocation Lines (${buffer.lineCount ?? lines.length})`}>
              {lines.map((line) => (
                <View key={line.id} style={styles.lineRow}>
                  <Text style={styles.lineDesc} numberOfLines={2}>
                    {line.paymentTypeName ?? '—'}
                  </Text>
                  <Text style={styles.lineAmount}>
                    {formatAmount(line.amount, buffer.currency ?? 'KES')}
                  </Text>
                </View>
              ))}
              {(buffer.lineCount ?? 0) > lines.length && (
                <Text style={styles.moreLines}>
                  +{(buffer.lineCount ?? 0) - lines.length} more lines
                </Text>
              )}
              <View style={styles.lineTotalRow}>
                <Text style={styles.lineTotalLabel}>Total Allocated</Text>
                <Text style={styles.lineTotalValue}>
                  {formatAmount(buffer.linesTotalAmount, buffer.currency ?? 'KES')}
                </Text>
              </View>
            </SectionCard>
          )}

          {/* Reconcile Section */}
          {buffer.canReconcile && (
            <SectionCard title="Reconcile Payment">
              <SearchableDropdown
                label="Unit *"
                value={selectedUnitId}
                displayValue={unitDisplay}
                options={unitOptions}
                onSelect={handleUnitSelect}
                onSearch={setUnitSearch}
                onClear={() => { setSelectedUnitId(''); setUnitDisplay(''); }}
                loading={unitsLoading}
                error={unitError}
                placeholder="Select unit to reconcile"
              />

              <SearchableDropdown
                label="Tenant (optional)"
                value={selectedTenantId}
                displayValue={tenantDisplay}
                options={tenantOptions}
                onSelect={handleTenantSelect}
                onSearch={setTenantSearch}
                onClear={() => { setSelectedTenantId(''); setTenantDisplay(''); }}
                loading={tenantsLoading}
                placeholder="Link to tenant (optional)"
              />

              <TouchableOpacity
                style={[styles.reconcileBtn, reconciling && styles.reconcileBtnDisabled]}
                onPress={submitReconcile}
                disabled={reconciling}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={reconciling ? colors.textMuted : '#fff'}
                />
                <Text style={[styles.reconcileBtnText, reconciling && { color: colors.textMuted }]}>
                  {reconciling ? 'Reconciling…' : 'Reconcile Payment'}
                </Text>
              </TouchableOpacity>
            </SectionCard>
          )}

          {!buffer.canReconcile && buffer.matchedTransactionId && (
            <SectionCard title="Status">
              <View style={styles.reconciledBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.reconciledText}>Already reconciled</Text>
              </View>
            </SectionCard>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      ) : null}
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
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroRef: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    heroSub: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    heroAmount: {
      fontSize: Typography.fontSize2xl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginTop: Spacing.sm,
    },
    lineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    lineDesc: {
      flex: 1,
      fontSize: Typography.fontSizeXs,
      color: c.text,
      marginRight: Spacing.sm,
    },
    lineAmount: {
      fontSize: Typography.fontSizeXs,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    moreLines: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    lineTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.sm,
      paddingTop: Spacing.xs,
    },
    lineTotalLabel: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textMuted,
    },
    lineTotalValue: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.text,
    },
    reconcileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: c.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.sm,
    },
    reconcileBtnDisabled: { backgroundColor: c.borderLight },
    reconcileBtnText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: '#fff',
    },
    reconciledBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm },
    reconciledText: {
      fontSize: Typography.fontSizeSm,
      color: Colors.success,
      fontWeight: Typography.fontWeightMedium,
    },
  });
}
