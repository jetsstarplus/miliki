import { Button } from '@/components/ui/Button';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATEUPDATE_TENANT_MUTATION } from '@/graphql/properties/mutations/leases';
import { BUILDINGS_DROPDOWN } from '@/graphql/properties/queries/building';
import { LEASE_DETAIL, LEASE_LIST } from '@/graphql/properties/queries/leases';
import { TENANTS_DROPDOWN } from '@/graphql/properties/queries/tenants';
import { UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LEASE_TYPES = [
  { value: 'FIXED_TERM', label: 'Fixed Term' },
  { value: 'MONTH_TO_MONTH', label: 'Monthly' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'SHORT_TERM', label: 'Short Term' },
];

const PAYMENT_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'ANNUAL', label: 'Annual' },
];

export default function AddLease() {
  const router = useRouter();
  const { leaseId } = useLocalSearchParams<{ leaseId?: string }>();
  const isEdit = !!leaseId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [serverError, setServerError] = useState('');

  // Selector display state
  const [buildingDisplay, setBuildingDisplay] = useState('');
  const [unitDisplay, setUnitDisplay] = useState('');
  const [tenantDisplay, setTenantDisplay] = useState('');

  // Selector IDs (used to drive occupancyId derivation)
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  // Search queries
  const [buildingSearch, setBuildingSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  const [form, setForm] = useState({
    occupancyId: '',
    leaseType: 'FIXED_TERM',
    rentAmount: '',
    depositAmount: '',
    paymentFrequency: 'MONTHLY',
    startDate: '',
    endDate: '',
    serviceCharge: '',
    paymentDueDay: '',
    signedDate: '',
    rentEscalationRate: '',
    latePaymentPenalty: false,
    renewalOption: false,
    specialConditions: '',
    internalNotes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // Dropdown queries
  const { data: buildingsData, loading: buildingsLoading } = useQuery(BUILDINGS_DROPDOWN, {
    variables: { first: 50, search: buildingSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const { data: unitsData, loading: unitsLoading } = useQuery(UNITS_DROPDOWN, {
    variables: {
      first: 50,
      search: unitSearch || undefined,
      buildingId: selectedBuildingId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: tenantsData, loading: tenantsLoading } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 100, search: tenantSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  // Build dropdown options
  const buildingOptions: DropdownOption[] = useMemo(
    () =>
      (buildingsData?.buildings?.edges ?? []).map((e: any) => ({
        id: e.node.id,
        label: e.node.name,
        sublabel: e.node.code ?? undefined,
      })),
    [buildingsData]
  );

  const unitOptions: DropdownOption[] = useMemo(
    () =>
      (unitsData?.units?.edges ?? []).map((e: any) => ({
        id: e.node.id,
        label: e.node.unitNumber,
        sublabel: e.node.building?.name ?? undefined,
        meta: {
          buildingId: e.node.building?.id ?? '',
          buildingName: e.node.building?.name ?? '',
          occupancyNode: e.node.occupancies?.edges?.[0]?.node ?? null,
        },
      })),
    [unitsData]
  );

  const tenantOptions: DropdownOption[] = useMemo(
    () =>
      (tenantsData?.tenants?.edges ?? [])
        .filter((e: any) => e.node.occupancies?.edges?.[0]?.node?.isCurrent)
        .map((e: any) => {
          const occ = e.node.occupancies?.edges?.[0]?.node;
          return {
            id: e.node.id,
            label: e.node.fullName,
            sublabel: occ?.unit
              ? `${occ.unit.unitNumber}${occ.unit.building?.name ? ' · ' + occ.unit.building.name : ''}`
              : undefined,
            meta: {
              occupancyId: occ?.id ?? '',
              unitId: occ?.unit?.id ?? '',
              unitNumber: occ?.unit?.unitNumber ?? '',
              buildingId: occ?.unit?.building?.id ?? '',
              buildingName: occ?.unit?.building?.name ?? '',
            },
          };
        }),
    [tenantsData]
  );

  const { data: editData, loading: editLoading } = useQuery(LEASE_DETAIL, {
    variables: { id: leaseId },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (editData?.lease) {
      const l = editData.lease;
      setForm({
        occupancyId: l.occupancy?.id ?? '',
        leaseType: l.leaseType ?? 'FIXED_TERM',
        rentAmount: l.rentAmount != null ? String(l.rentAmount) : '',
        depositAmount: l.depositAmount != null ? String(l.depositAmount) : '',
        paymentFrequency: l.paymentFrequency ?? 'MONTHLY',
        startDate: l.startDate ?? '',
        endDate: l.endDate ?? '',
        serviceCharge: l.serviceCharge != null ? String(l.serviceCharge) : '',
        paymentDueDay: l.paymentDueDay != null ? String(l.paymentDueDay) : '',
        signedDate: l.signedDate ?? '',
        rentEscalationRate: l.rentEscalationRate != null ? String(l.rentEscalationRate) : '',
        latePaymentPenalty: l.latePaymentPenalty ?? false,
        renewalOption: l.renewalOption ?? false,
        specialConditions: l.specialConditions ?? '',
        internalNotes: l.internalNotes ?? '',
      });
      // Populate selector display values from edit data
      const occ = l.occupancy;
      if (occ) {
        const resolvedBuildingId = occ.unit?.building?.id ?? '';
        const resolvedBuildingName = occ.unit?.building?.name ?? '';
        setSelectedBuildingId(resolvedBuildingId);
        setSelectedUnitId(occ.unit?.id ?? '');
        setSelectedTenantId(occ.tenant?.id ?? '');
        setBuildingDisplay(resolvedBuildingName);
        setUnitDisplay(occ.unit?.unitNumber ?? '');
        setTenantDisplay(occ.tenant?.fullName ?? '');
      }
    }
  }, [editData]);

  // ── Cascade handlers ─────────────────────────────────────────────────────

  function handleBuildingSelect(opt: DropdownOption) {
    setSelectedBuildingId(opt.id);
    setBuildingDisplay(opt.label);
    setSelectedUnitId('');
    setUnitDisplay('');
    setSelectedTenantId('');
    setTenantDisplay('');
    setForm(f => ({ ...f, occupancyId: '' }));
    if (errors.occupancyId) setErrors(e => ({ ...e, occupancyId: '' }));
  }

  function handleBuildingClear() {
    setSelectedBuildingId('');
    setBuildingDisplay('');
    setSelectedUnitId('');
    setUnitDisplay('');
    setSelectedTenantId('');
    setTenantDisplay('');
    setForm(f => ({ ...f, occupancyId: '' }));
  }

  function handleUnitSelect(opt: DropdownOption) {
    const meta = opt.meta ?? {};
    const occ = meta.occupancyNode as { id?: string; isCurrent?: boolean; tenant?: { id: string; fullName: string } } | null;
    setSelectedUnitId(opt.id);
    setUnitDisplay(opt.label);
    if (meta.buildingId) {
      setSelectedBuildingId(meta.buildingId as string);
      setBuildingDisplay(meta.buildingName as string);
    }
    if (occ?.isCurrent && occ.tenant) {
      setSelectedTenantId(occ.tenant.id);
      setTenantDisplay(occ.tenant.fullName);
      setForm(f => ({ ...f, occupancyId: occ.id ?? '' }));
    } else {
      setSelectedTenantId('');
      setTenantDisplay('');
      setForm(f => ({ ...f, occupancyId: '' }));
    }
    if (errors.occupancyId) setErrors(e => ({ ...e, occupancyId: '' }));
  }

  function handleUnitClear() {
    setSelectedUnitId('');
    setUnitDisplay('');
    setSelectedTenantId('');
    setTenantDisplay('');
    setForm(f => ({ ...f, occupancyId: '' }));
  }

  function handleTenantSelect(opt: DropdownOption) {
    const meta = opt.meta ?? {};
    setSelectedTenantId(opt.id);
    setTenantDisplay(opt.label);
    if (meta.unitId) {
      setSelectedUnitId(meta.unitId as string);
      setUnitDisplay(meta.unitNumber as string);
    }
    if (meta.buildingId) {
      setSelectedBuildingId(meta.buildingId as string);
      setBuildingDisplay(meta.buildingName as string);
    }
    setForm(f => ({ ...f, occupancyId: meta.occupancyId as string ?? '' }));
    if (errors.occupancyId) setErrors(e => ({ ...e, occupancyId: '' }));
  }

  function handleTenantClear() {
    setSelectedTenantId('');
    setTenantDisplay('');
    setForm(f => ({ ...f, occupancyId: '' }));
  }

  const [saveLease, { loading }] = useMutation(CREATEUPDATE_TENANT_MUTATION, {
    refetchQueries: isEdit
      ? [{ query: LEASE_DETAIL, variables: { id: leaseId } }, { query: LEASE_LIST }]
      : [{ query: LEASE_LIST }],
    onCompleted(data: any) {
      const result = data?.createUpdateLease;
      if (result?.success) {
        router.back();
      } else {
        setServerError(result?.message ?? 'Something went wrong.');
      }
    },
    onError(err: any) { setServerError(err.message); },
  });

  function setStr(field: keyof typeof form) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function validate() {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.occupancyId.trim()) e.occupancyId = 'Occupancy ID is required';
    if (!form.rentAmount) e.rentAmount = 'Rent amount is required';
    if (!form.depositAmount) e.depositAmount = 'Deposit amount is required';
    if (!form.startDate.trim()) e.startDate = 'Start date is required';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    saveLease({
      variables: {
        id: isEdit ? leaseId : undefined,
        occupancyId: form.occupancyId.trim(),
        leaseType: form.leaseType,
        rentAmount: parseFloat(form.rentAmount),
        depositAmount: parseFloat(form.depositAmount),
        paymentFrequency: form.paymentFrequency,
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim() || undefined,
        serviceCharge: form.serviceCharge ? parseFloat(form.serviceCharge) : undefined,
        paymentDueDay: form.paymentDueDay ? parseInt(form.paymentDueDay, 10) : undefined,
        signedDate: form.signedDate.trim() || undefined,
        rentEscalationRate: form.rentEscalationRate ? parseFloat(form.rentEscalationRate) : undefined,
        latePaymentPenalty: form.latePaymentPenalty,
        renewalOption: form.renewalOption,
        specialConditions: form.specialConditions.trim() || undefined,
        internalNotes: form.internalNotes.trim() || undefined,
      },
    });
  }

  if (isEdit && editLoading && !editData) return <LoadingState />;

  return (
    <FormLayout title={isEdit ? 'Edit Lease' : 'New Lease'}>
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Occupancy</SectionLabel>

      <SearchableDropdown
        label="Building"
        value={selectedBuildingId}
        displayValue={buildingDisplay}
        options={buildingOptions}
        onSelect={handleBuildingSelect}
        onSearch={setBuildingSearch}
        onClear={handleBuildingClear}
        loading={buildingsLoading}
        placeholder="Select building"
      />

      <SearchableDropdown
        label="Unit"
        value={selectedUnitId}
        displayValue={unitDisplay}
        options={unitOptions}
        onSelect={handleUnitSelect}
        onSearch={setUnitSearch}
        onClear={handleUnitClear}
        loading={unitsLoading}
        placeholder={selectedBuildingId ? 'Select unit' : 'Select a building first'}
      />

      <SearchableDropdown
        label="Tenant *"
        value={selectedTenantId}
        displayValue={tenantDisplay}
        options={tenantOptions}
        onSelect={handleTenantSelect}
        onSearch={setTenantSearch}
        onClear={handleTenantClear}
        loading={tenantsLoading}
        error={errors.occupancyId}
        placeholder="Select tenant with active occupancy"
      />

      <SectionLabel>Lease type</SectionLabel>

      <View style={styles.chipRow}>
        {LEASE_TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.optionChip, form.leaseType === t.value && styles.optionChipActive]}
            onPress={() => setForm(f => ({ ...f, leaseType: t.value }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionChipText, form.leaseType === t.value && styles.optionChipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Financials</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Rent amount *"
          error={errors.rentAmount}
          value={form.rentAmount}
          onChangeText={setStr('rentAmount')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Deposit *"
          error={errors.depositAmount}
          value={form.depositAmount}
          onChangeText={setStr('depositAmount')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Service charge"
          value={form.serviceCharge}
          onChangeText={setStr('serviceCharge')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Escalation rate %"
          value={form.rentEscalationRate}
          onChangeText={setStr('rentEscalationRate')}
          placeholder="0.0"
          keyboardType="decimal-pad"
        />
      </View>

      <SectionLabel>Payment frequency</SectionLabel>

      <View style={styles.chipRow}>
        {PAYMENT_FREQUENCIES.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.optionChip, form.paymentFrequency === f.value && styles.optionChipActive]}
            onPress={() => setForm(fm => ({ ...fm, paymentFrequency: f.value }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionChipText, form.paymentFrequency === f.value && styles.optionChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label="Payment due day"
        value={form.paymentDueDay}
        onChangeText={setStr('paymentDueDay')}
        placeholder="e.g. 5 (day of month)"
        keyboardType="number-pad"
      />

      <SectionLabel>Dates</SectionLabel>

      <View style={styles.row}>
        <DatePickerInput
          containerStyle={{ flex: 1 }}
          label="Start date *"
          error={errors.startDate}
          value={form.startDate}
          onChange={setStr('startDate')}
          placeholder="Select start date"
        />
        <View style={{ width: Spacing.sm }} />
        <DatePickerInput
          containerStyle={{ flex: 1 }}
          label="End date"
          value={form.endDate}
          onChange={setStr('endDate')}
          placeholder="Select end date"
        />
      </View>

      <DatePickerInput
        label="Signed date"
        value={form.signedDate}
        onChange={setStr('signedDate')}
        placeholder="Select signed date"
      />

      <SectionLabel>Options</SectionLabel>

      <View style={styles.togglesRow}>
        {[
          { key: 'latePaymentPenalty' as const, label: 'Late Payment Penalty' },
          { key: 'renewalOption' as const, label: 'Renewal Option' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.toggleChip, form[opt.key] && styles.toggleChipActive]}
            onPress={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={form[opt.key] ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={form[opt.key] ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.toggleLabel, form[opt.key] && styles.toggleLabelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label="Special conditions"
        value={form.specialConditions}
        onChangeText={setStr('specialConditions')}
        placeholder="Any special conditions�"
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      <Input
        label="Internal notes"
        value={form.internalNotes}
        onChangeText={setStr('internalNotes')}
        placeholder="Internal notes (not shared with tenant)�"
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      <Button title={isEdit ? 'Save changes' : 'Create lease'} onPress={submit} loading={loading} />
    </FormLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
    optionChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    optionChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    optionChipText: { fontSize: Typography.fontSizeSm, fontWeight: '500', color: c.textMuted },
    optionChipTextActive: { color: '#fff' },
    togglesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
    toggleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    toggleChipActive: { backgroundColor: c.primary + '20', borderColor: c.primary },
    toggleLabel: { fontSize: Typography.fontSizeSm, fontWeight: '500', color: c.textMuted },
    toggleLabelActive: { color: c.primary },
  });
}
