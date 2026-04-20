import { Button } from '@/components/ui/Button';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATE_MANUAL_RECEIPT } from '@/graphql/properties/mutations/payments';
import { CONFIG_PAYMENT_MODES_QUERY, MANUAL_RECEIPTS_QUERY } from '@/graphql/properties/queries/payments';
import { TENANTS_DROPDOWN } from '@/graphql/properties/queries/tenants';
import { UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  amount: string;
  paymentDate: string;
  referenceNumber: string;
  notes: string;
}

interface FormErrors {
  tenantId?: string;
  unitId?: string;
  paymentMethodConfigId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  amount?: string;
  paymentDate?: string;
  referenceNumber?: string;
}

export default function CreateManualReceipt() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [serverError, setServerError] = useState('');
  const [form, setForm] = useState<FormState>({
    firstName: '',
    middleName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Selector state
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantDisplay, setTenantDisplay] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitDisplay, setUnitDisplay] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  const [selectedPaymentModeId, setSelectedPaymentModeId] = useState('');
  const [paymentModeDisplay, setPaymentModeDisplay] = useState('');
  const [paymentModeRequiresRef, setPaymentModeRequiresRef] = useState(false);

  const [payerInfoExpanded, setPayerInfoExpanded] = useState(false);
  const [tenantMeta, setTenantMeta] = useState({
    unitId: '', unitNumber: '', buildingName: '',
    firstName: '', lastName: '', middleName: '', phone: '', email: '',
    arrears: 0,
  });

  // Queries
  const { data: tenantsData, loading: tenantsLoading } = useQuery(TENANTS_DROPDOWN, {
    variables: { first: 100, search: tenantSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const { data: unitsData, loading: unitsLoading } = useQuery(UNITS_DROPDOWN, {
    variables: { first: 50, search: unitSearch || undefined },
    fetchPolicy: 'cache-and-network',
    skip: !!selectedTenantId,
  });

  const { data: modesData, loading: modesLoading } = useQuery(CONFIG_PAYMENT_MODES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  // Options
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
              : e.node.phone ?? undefined,
            meta: {
              unitId: occ?.unit?.id ?? '',
              unitNumber: occ?.unit?.unitNumber ?? '',
              buildingName: occ?.unit?.building?.name ?? '',
              firstName: e.node.firstName ?? '',
              lastName: e.node.lastName ?? '',
              middleName: e.node.middleName ?? '',
              phone: e.node.phone ?? '',
              email: e.node.email ?? '',
              totalArrears: e.node.totalArrears ?? 0,
            },
          };
        }),
    [tenantsData]
  );

  const unitOptions: DropdownOption[] = useMemo(() => {
    if (selectedTenantId && tenantMeta.unitId) {
      return [{
        id: tenantMeta.unitId,
        label: tenantMeta.unitNumber,
        sublabel: tenantMeta.buildingName || undefined,
      }];
    }
    return (unitsData?.units?.edges ?? []).map((e: any) => ({
      id: e.node.id,
      label: e.node.unitNumber,
      sublabel: e.node.building?.name ?? undefined,
    }));
  }, [selectedTenantId, tenantMeta, unitsData]);

  const paymentModeOptions: DropdownOption[] = useMemo(
    () =>
      (modesData?.configPaymentModes?.edges ?? [])
        .filter((e: any) => e.node.isActive)
        .map((e: any) => ({
          id: e.node.id,
          label: e.node.name,
          sublabel: e.node.code ?? undefined,
          meta: { requiresReference: e.node.requiresReference },
        })),
    [modesData]
  );

  const [createReceipt, { loading: saving }] = useMutation(CREATE_MANUAL_RECEIPT, {
    refetchQueries: [{ query: MANUAL_RECEIPTS_QUERY, variables: { first: 20 } }],
    onCompleted(d: any) {
      const r = d?.createManualReceipt?.manualReceipt;
      if (r?.id) {
        router.replace({ pathname: '/(tabs)/payments/manual/[id]', params: { id: r.id } } as any);
      }
    },
    onError(err: any) {
      setServerError(err.message);
    },
  });

  function setStr(field: keyof FormState) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if ((errors as any)[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function handleTenantSelect(opt: DropdownOption) {
    const meta = opt.meta ?? {};
    const m = {
      unitId: (meta.unitId as string) ?? '',
      unitNumber: (meta.unitNumber as string) ?? '',
      buildingName: (meta.buildingName as string) ?? '',
      firstName: (meta.firstName as string) ?? '',
      lastName: (meta.lastName as string) ?? '',
      middleName: (meta.middleName as string) ?? '',
      phone: (meta.phone as string) ?? '',
      email: (meta.email as string) ?? '',
      arrears: (meta.totalArrears as number) ?? 0,
    };
    setSelectedTenantId(opt.id);
    setTenantDisplay(opt.label);
    setTenantMeta(m);
    if (m.unitId) {
      setSelectedUnitId(m.unitId);
      setUnitDisplay(`${m.unitNumber}${m.buildingName ? ' · ' + m.buildingName : ''}`);
    }
    setForm(f => ({
      ...f,
      firstName: m.firstName,
      middleName: m.middleName,
      lastName: m.lastName,
      phoneNumber: m.phone,
      email: m.email,
    }));
    setErrors(e => ({ ...e, tenantId: '' }));
  }

  function handleTenantClear() {
    setSelectedTenantId('');
    setTenantDisplay('');
    setTenantMeta({ unitId: '', unitNumber: '', buildingName: '', firstName: '', lastName: '', middleName: '', phone: '', email: '', arrears: 0 });
    setSelectedUnitId('');
    setUnitDisplay('');
    setForm(f => ({ ...f, firstName: '', middleName: '', lastName: '', phoneNumber: '', email: '' }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!selectedTenantId) e.tenantId = 'Tenant is required';
    if (!selectedUnitId) e.unitId = 'Unit is required';
    if (!selectedPaymentModeId) e.paymentMethodConfigId = 'Payment method is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Valid amount is required';
    if (!form.paymentDate) e.paymentDate = 'Payment date is required';
    if (paymentModeRequiresRef && !form.referenceNumber.trim())
      e.referenceNumber = 'Reference number is required for this payment method';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setServerError('');
    createReceipt({
      variables: {
        input: {
          tenantId: selectedTenantId,
          unitId: selectedUnitId,
          paymentMethodConfigId: selectedPaymentModeId,
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim() || undefined,
          lastName: form.lastName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          email: form.email.trim() || undefined,
          amount: parseFloat(form.amount),
          paymentDate: form.paymentDate,
          referenceNumber: form.referenceNumber.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      },
    });
  }

  return (
    <FormLayout title="New Manual Receipt">
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Allocation</SectionLabel>

      <SearchableDropdown
        label="Tenant *"
        value={selectedTenantId}
        displayValue={tenantDisplay}
        options={tenantOptions}
        onSelect={handleTenantSelect}
        onSearch={setTenantSearch}
        onClear={handleTenantClear}
        loading={tenantsLoading}
        error={errors.tenantId}
        placeholder="Search tenant by name"
      />

      {selectedTenantId && tenantMeta.arrears > 0 ? (
        <View style={styles.arrearsBadge}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
          <Text style={styles.arrearsText}>
            Outstanding arrears:{' '}
            <Text style={styles.arrearsAmount}>KES {Number(tenantMeta.arrears).toLocaleString()}</Text>
          </Text>
        </View>
      ) : null}

      <SearchableDropdown
        label="Unit *"
        value={selectedUnitId}
        displayValue={unitDisplay}
        options={unitOptions}
        onSelect={(opt) => {
          setSelectedUnitId(opt.id);
          setUnitDisplay(opt.label + (opt.sublabel ? ` · ${opt.sublabel}` : ''));
          setErrors(e => ({ ...e, unitId: '' }));
        }}
        onSearch={setUnitSearch}
        onClear={() => { setSelectedUnitId(''); setUnitDisplay(''); }}
        loading={unitsLoading}
        error={errors.unitId}
        placeholder={selectedTenantId ? 'Auto-selected from tenant' : 'Search unit'}
        disabled={!!selectedTenantId}
      />

      <SectionLabel>Payment Method</SectionLabel>

      <SearchableDropdown
        label="Payment Method *"
        value={selectedPaymentModeId}
        displayValue={paymentModeDisplay}
        options={paymentModeOptions}
        onSelect={(opt) => {
          setSelectedPaymentModeId(opt.id);
          setPaymentModeDisplay(opt.label);
          setPaymentModeRequiresRef(!!(opt.meta as any)?.requiresReference);
          setErrors(e => ({ ...e, paymentMethodConfigId: '' }));
        }}
        onSearch={() => {}}
        onClear={() => {
          setSelectedPaymentModeId('');
          setPaymentModeDisplay('');
          setPaymentModeRequiresRef(false);
        }}
        loading={modesLoading}
        error={errors.paymentMethodConfigId}
        placeholder="Select payment method"
        searchable={false}
      />

      <TouchableOpacity
        style={styles.sectionToggleRow}
        onPress={() => setPayerInfoExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionToggleLabel}>Payer Info</Text>
        {!payerInfoExpanded && (form.firstName || form.phoneNumber) ? (
          <Text style={styles.sectionToggleSummary} numberOfLines={1}>
            {[form.firstName, form.lastName].filter(Boolean).join(' ')}{form.phoneNumber ? `  ·  ${form.phoneNumber}` : ''}
          </Text>
        ) : null}
        <Ionicons
          name={payerInfoExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {payerInfoExpanded && (
        <>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Input
              containerStyle={{ flex: 1 }}
              label="First Name *"
              value={form.firstName}
              onChangeText={setStr('firstName')}
              error={errors.firstName}
              placeholder="First name"
              autoCapitalize="words"
            />
            <Input
              containerStyle={{ flex: 1 }}
              label="Last Name *"
              value={form.lastName}
              onChangeText={setStr('lastName')}
              error={errors.lastName}
              placeholder="Last name"
              autoCapitalize="words"
            />
          </View>

          <Input
            label="Middle Name"
            value={form.middleName}
            onChangeText={setStr('middleName')}
            placeholder="Middle name (optional)"
            autoCapitalize="words"
          />

          <Input
            label="Phone Number *"
            value={form.phoneNumber}
            onChangeText={setStr('phoneNumber')}
            error={errors.phoneNumber}
            placeholder="e.g. 0712345678"
            keyboardType="phone-pad"
          />

          <Input
            label="Email"
            value={form.email}
            onChangeText={setStr('email')}
            placeholder="Email (optional)"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>
      )}

      <SectionLabel>Payment Details</SectionLabel>

      <Input
        label="Amount *"
        value={form.amount}
        onChangeText={setStr('amount')}
        error={errors.amount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      <DatePickerInput
        label="Payment Date *"
        value={form.paymentDate}
        onChange={(d) => {
          setForm(f => ({ ...f, paymentDate: d }));
          setErrors(e => ({ ...e, paymentDate: '' }));
        }}
        error={errors.paymentDate}
        placeholder="Select date"
      />

      {paymentModeRequiresRef && (
        <Input
          label="Reference Number *"
          value={form.referenceNumber}
          onChangeText={setStr('referenceNumber')}
          error={errors.referenceNumber}
          placeholder="Payment reference / receipt number"
        />
      )}

      <Input
        label="Notes"
        value={form.notes}
        onChangeText={setStr('notes')}
        placeholder="Optional notes"
        multiline
        numberOfLines={3}
      />

      <Button
        title={saving ? 'Saving…' : 'Create Receipt'}
        onPress={submit}
        disabled={saving}
        variant="primary"
      />
    </FormLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    sectionToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    sectionToggleLabel: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sectionToggleSummary: {
      flex: 1,
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
    },
    arrearsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: Colors.warning + '18',
      borderWidth: 1,
      borderColor: Colors.warning + '55',
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    arrearsText: {
      flex: 1,
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
    },
    arrearsAmount: {
      fontWeight: Typography.fontWeightSemibold,
      color: Colors.warning,
    },
  });
}
