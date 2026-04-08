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
import { CREATEUPDATEMAINTENANCE } from '@/graphql/properties/mutations/maintenance';
import { BUILDINGS_DROPDOWN } from '@/graphql/properties/queries/building';
import { MAINTENANCE, MAINTENANCES } from '@/graphql/properties/queries/maintenance';
import { TENANTS_DROPDOWN } from '@/graphql/properties/queries/tenants';
import { UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'STRUCTURAL', label: 'Structural' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCES', label: 'Appliances' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'TRIAGE', label: 'Triage' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AddMaintenance() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const isEdit = !!requestId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [serverError, setServerError] = useState('');

  // Selector display state (names shown in the triggers)
  const [buildingDisplay, setBuildingDisplay] = useState('');
  const [unitDisplay, setUnitDisplay] = useState('');
  const [tenantDisplay, setTenantDisplay] = useState('');

  // Search queries for dropdowns
  const [buildingSearch, setBuildingSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  const [form, setForm] = useState({
    buildingId: '',
    title: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    status: 'NEW',
    unitId: '',
    tenantId: '',
    vendorName: '',
    estimatedCost: '',
    actualCost: '',
    requestedDate: '',
    scheduledDate: '',
    slaHours: '',
    tenantImpact: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // GraphQL dropdown queries
  const { data: buildingsData, loading: buildingsLoading } = useQuery(BUILDINGS_DROPDOWN, {
    variables: { first: 50, search: buildingSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const { data: unitsData, loading: unitsLoading } = useQuery(UNITS_DROPDOWN, {
    variables: {
      first: 50,
      search: unitSearch || undefined,
      buildingId: form.buildingId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: tenantsData, loading: tenantsLoading } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 100, search: tenantSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  // Map raw data to DropdownOption lists
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

  // Only tenants who have a current occupancy
  const tenantOptions: DropdownOption[] = useMemo(
    () =>
      (tenantsData?.tenants?.edges ?? [])
        .filter((e: any) => {
          const occ = e.node.occupancies?.edges?.[0]?.node;
          return occ?.isCurrent;
        })
        .map((e: any) => {
          const occ = e.node.occupancies?.edges?.[0]?.node;
          return {
            id: e.node.id,
            label: e.node.fullName,
            sublabel: occ?.unit
              ? `${occ.unit.unitNumber}${occ.unit.building?.name ? ' · ' + occ.unit.building.name : ''}`
              : undefined,
            meta: {
              unitId: occ?.unit?.id ?? '',
              unitNumber: occ?.unit?.unitNumber ?? '',
              buildingId: occ?.unit?.building?.id ?? '',
              buildingName: occ?.unit?.building?.name ?? '',
            },
          };
        }),
    [tenantsData]
  );

  const { data: editData, loading: editLoading } = useQuery(MAINTENANCE, {
    variables: { id: requestId },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (editData?.maintenanceRequest) {
      const r = editData.maintenanceRequest;
      const resolvedBuildingId = r.building?.id ?? r.unit?.building?.id ?? '';
      const resolvedBuildingName = r.building?.name ?? r.unit?.building?.name ?? '';
      setForm({
        buildingId: resolvedBuildingId,
        title: r.title ?? '',
        description: r.description ?? '',
        category: r.category ?? 'OTHER',
        priority: r.priority ?? 'MEDIUM',
        status: r.status ?? 'NEW',
        unitId: r.unit?.id ?? '',
        tenantId: r.tenant?.id ?? '',
        vendorName: r.vendorName ?? '',
        estimatedCost: r.estimatedCost != null ? String(r.estimatedCost) : '',
        actualCost: r.actualCost != null ? String(r.actualCost) : '',
        requestedDate: r.requestedDate ?? '',
        scheduledDate: r.scheduledDate ?? '',
        slaHours: r.slaHours != null ? String(r.slaHours) : '',
        tenantImpact: r.tenantImpact ?? false,
      });
      setBuildingDisplay(resolvedBuildingName);
      setUnitDisplay(r.unit?.unitNumber ?? '');
      setTenantDisplay(r.tenant?.fullName ?? '');
    }
  }, [editData]);

  // ── Cascade handlers ─────────────────────────────────────────────────────

  function handleBuildingSelect(opt: DropdownOption) {
    setForm(f => ({ ...f, buildingId: opt.id, unitId: '', tenantId: '' }));
    setBuildingDisplay(opt.label);
    setUnitDisplay('');
    setTenantDisplay('');
    if (errors.buildingId) setErrors(e => ({ ...e, buildingId: '' }));
  }

  function handleBuildingClear() {
    setForm(f => ({ ...f, buildingId: '', unitId: '', tenantId: '' }));
    setBuildingDisplay('');
    setUnitDisplay('');
    setTenantDisplay('');
  }

  function handleUnitSelect(opt: DropdownOption) {
    const meta = opt.meta ?? {};
    const occ = meta.occupancyNode as { isCurrent?: boolean; tenant?: { id: string; fullName: string } } | null;
    setForm(f => ({
      ...f,
      unitId: opt.id,
      buildingId: meta.buildingId || f.buildingId,
      tenantId: occ?.isCurrent && occ.tenant ? occ.tenant.id : '',
    }));
    setUnitDisplay(opt.label);
    if (meta.buildingId && meta.buildingName) setBuildingDisplay(meta.buildingName as string);
    setTenantDisplay(occ?.isCurrent && occ.tenant ? occ.tenant.fullName : '');
  }

  function handleUnitClear() {
    setForm(f => ({ ...f, unitId: '', tenantId: '' }));
    setUnitDisplay('');
    setTenantDisplay('');
  }

  function handleTenantSelect(opt: DropdownOption) {
    const meta = opt.meta ?? {};
    setForm(f => ({
      ...f,
      tenantId: opt.id,
      unitId: meta.unitId || f.unitId,
      buildingId: meta.buildingId || f.buildingId,
    }));
    setTenantDisplay(opt.label);
    if (meta.unitNumber) setUnitDisplay(meta.unitNumber as string);
    if (meta.buildingName) setBuildingDisplay(meta.buildingName as string);
  }

  function handleTenantClear() {
    setForm(f => ({ ...f, tenantId: '' }));
    setTenantDisplay('');
  }

  const [saveMaintenance, { loading }] = useMutation(CREATEUPDATEMAINTENANCE, {
    refetchQueries: isEdit
      ? [{ query: MAINTENANCE, variables: { id: requestId } }, { query: MAINTENANCES }]
      : [{ query: MAINTENANCES }],
    onCompleted(data: any) {
      const result = data?.createUpdateMaintenanceRequest;
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
    if (!form.buildingId.trim()) e.buildingId = 'Building ID is required';
    if (!form.title.trim()) e.title = 'Title is required';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    saveMaintenance({
      variables: {
        id: isEdit ? requestId : undefined,
        buildingId: form.buildingId.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        priority: form.priority || undefined,
        status: form.status || undefined,
        unitId: form.unitId.trim() || undefined,
        tenantId: form.tenantId.trim() || undefined,
        vendorName: form.vendorName.trim() || undefined,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        actualCost: form.actualCost ? parseFloat(form.actualCost) : undefined,
        requestedDate: form.requestedDate.trim() || undefined,
        scheduledDate: form.scheduledDate.trim() || undefined,
        slaHours: form.slaHours ? parseInt(form.slaHours, 10) : undefined,
        tenantImpact: form.tenantImpact,
      },
    });
  }

  if (isEdit && editLoading && !editData) return <LoadingState />;

  return (
    <FormLayout title={isEdit ? 'Edit Request' : 'New Maintenance Request'}>
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Location</SectionLabel>

      <SearchableDropdown
        label="Building *"
        value={form.buildingId}
        displayValue={buildingDisplay}
        options={buildingOptions}
        onSelect={handleBuildingSelect}
        onSearch={setBuildingSearch}
        onClear={handleBuildingClear}
        loading={buildingsLoading}
        error={errors.buildingId}
        placeholder="Select building"
      />

      <SearchableDropdown
        label="Unit"
        value={form.unitId}
        displayValue={unitDisplay}
        options={unitOptions}
        onSelect={handleUnitSelect}
        onSearch={setUnitSearch}
        onClear={handleUnitClear}
        loading={unitsLoading}
        placeholder={form.buildingId ? 'Select unit' : 'Select a building first'}
        disabled={false}
      />

      <SearchableDropdown
        label="Tenant"
        value={form.tenantId}
        displayValue={tenantDisplay}
        options={tenantOptions}
        onSelect={handleTenantSelect}
        onSearch={setTenantSearch}
        onClear={handleTenantClear}
        loading={tenantsLoading}
        placeholder="Select tenant (optional)"
      />

      <SectionLabel>Request details</SectionLabel>

      <Input
        label="Title *"
        error={errors.title}
        value={form.title}
        onChangeText={setStr('title')}
        placeholder="Brief title of the issue"
        autoCapitalize="sentences"
      />

      <Input
        label="Description"
        value={form.description}
        onChangeText={setStr('description')}
        placeholder="Detailed description of the issue�"
        multiline
        numberOfLines={4}
        autoCapitalize="sentences"
      />

      <SectionLabel>Category</SectionLabel>

      <View style={styles.chipRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.optionChip, form.category === cat.value && styles.optionChipActive]}
            onPress={() => setForm(f => ({ ...f, category: cat.value }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionChipText, form.category === cat.value && styles.optionChipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Priority</SectionLabel>

      <View style={styles.chipRow}>
        {PRIORITIES.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.optionChip, form.priority === p.value && styles.optionChipActive]}
            onPress={() => setForm(f => ({ ...f, priority: p.value }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionChipText, form.priority === p.value && styles.optionChipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Status</SectionLabel>

      <View style={styles.chipRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.optionChip, form.status === s.value && styles.optionChipActive]}
            onPress={() => setForm(f => ({ ...f, status: s.value }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionChipText, form.status === s.value && styles.optionChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Scheduling</SectionLabel>

      <View style={styles.row}>
        <DatePickerInput
          containerStyle={{ flex: 1 }}
          label="Requested date"
          value={form.requestedDate}
          onChange={setStr('requestedDate')}
          placeholder="Select date"
        />
        <View style={{ width: Spacing.sm }} />
        <DatePickerInput
          containerStyle={{ flex: 1 }}
          label="Scheduled date"
          value={form.scheduledDate}
          onChange={setStr('scheduledDate')}
          placeholder="Select date"
        />
      </View>

      <Input
        label="SLA hours"
        value={form.slaHours}
        onChangeText={setStr('slaHours')}
        placeholder="e.g. 24"
        keyboardType="number-pad"
      />

      <SectionLabel>Costs</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Estimated cost"
          value={form.estimatedCost}
          onChangeText={setStr('estimatedCost')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Actual cost"
          value={form.actualCost}
          onChangeText={setStr('actualCost')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <Input
        label="Vendor name"
        value={form.vendorName}
        onChangeText={setStr('vendorName')}
        placeholder="Service provider / vendor"
        autoCapitalize="words"
      />

      <SectionLabel>Options</SectionLabel>

      <TouchableOpacity
        style={[styles.toggleChip, form.tenantImpact && styles.toggleChipActive]}
        onPress={() => setForm(f => ({ ...f, tenantImpact: !f.tenantImpact }))}
        activeOpacity={0.7}
      >
        <Ionicons
          name={form.tenantImpact ? 'checkmark-circle' : 'ellipse-outline'}
          size={16}
          color={form.tenantImpact ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.toggleLabel, form.tenantImpact && styles.toggleLabelActive]}>
          Affects tenant (tenant impact)
        </Text>
      </TouchableOpacity>

      <Button title={isEdit ? 'Save changes' : 'Submit request'} onPress={submit} loading={loading} />
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
    toggleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      marginBottom: Spacing.md,
    },
    toggleChipActive: { backgroundColor: c.primary + '20', borderColor: c.primary },
    toggleLabel: { fontSize: Typography.fontSizeSm, fontWeight: '500', color: c.textMuted },
    toggleLabelActive: { color: c.primary },
  });
}
