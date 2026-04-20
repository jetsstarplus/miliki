import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATE_UPDATE_UNIT } from '@/graphql/properties/mutations/units';
import { BUILDINGS_FOR_DROPDOWN } from '@/graphql/properties/queries/building';
import { UNIT_DETAIL_QUERY, UNIT_TYPES_QUERY, UNITS_QUERY } from '@/graphql/properties/queries/units';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PAYMENT_PERIODS = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

const EMPTY_FORM = {
  unitNumber: '',
  accountNumber: '',
  floor: '',
  bedrooms: '',
  bathrooms: '',
  squareFeet: '',
  monthlyRent: '',
  depositAmount: '',
  serviceCharge: '',
  purchasePrice: '',
  description: '',
  isAvailableForRent: 'true',
  isAvailableForPurchase: 'false',
  paymentPeriod: 'MONTHLY',
};

export default function AddEditUnit() {
  const router = useRouter();
  const { unitId, buildingId: presetBuildingId } = useLocalSearchParams<{ unitId?: string; buildingId?: string }>();
  const isEdit = !!unitId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [serverError, setServerError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM & { building: string; unitType: string }>>({}); 
  const [selectedBuildingId, setSelectedBuildingId] = useState(presetBuildingId ?? '');
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState('');
  const [autofilled, setAutofilled] = useState(false);

  const { data: editData, loading: editLoading } = useQuery(UNIT_DETAIL_QUERY, {
    variables: { id: unitId },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });

  const { data: buildingsData } = useQuery(BUILDINGS_FOR_DROPDOWN);
  const { data: unitTypesData } = useQuery(UNIT_TYPES_QUERY);

  const buildings: { id: string; name: string }[] =
    buildingsData?.buildings?.edges?.map((e: any) => e.node) ?? [];

  const unitTypes: any[] = useMemo(
    () => unitTypesData?.unitTypes?.edges?.map((e: any) => e.node).filter((t: any) => t.isActive !== false) ?? [],
    [unitTypesData]
  );

  useEffect(() => {
    if (editData?.unit) {
      const u = editData.unit;
      setForm({
        unitNumber: u.unitNumber ?? '',
        accountNumber: u.accountNumber ?? '',
        floor: u.floor ?? '',
        bedrooms: u.bedrooms != null ? String(u.bedrooms) : '',
        bathrooms: u.bathrooms != null ? String(u.bathrooms) : '',
        squareFeet: u.squareFeet != null ? String(u.squareFeet) : '',
        monthlyRent: u.monthlyRent != null ? String(u.monthlyRent) : '',
        depositAmount: u.depositAmount != null ? String(u.depositAmount) : '',
        serviceCharge: u.serviceCharge != null ? String(u.serviceCharge) : '',
        purchasePrice: u.purchasePrice != null ? String(u.purchasePrice) : '',
        description: u.description ?? '',
        isAvailableForRent: u.isAvailableForRent ? 'true' : 'false',
        isAvailableForPurchase: u.isAvailableForPurchase ? 'true' : 'false',
        paymentPeriod: u.paymentPeriod ?? 'MONTHLY',
      });
      if (u.building?.id) setSelectedBuildingId(u.building.id);
    }
  }, [editData]);

  // Keep unit type chip in sync regardless of which query loads first
  useEffect(() => {
    const typeId = editData?.unit?.unitType?.id;
    if (typeId && unitTypes.length > 0) {
      setSelectedUnitTypeId(typeId);
    }
  }, [editData, unitTypes]);

  function selectUnitType(typeId: string) {
    if (selectedUnitTypeId === typeId) {
      setSelectedUnitTypeId('');
      setAutofilled(false);
      return;
    }
    setSelectedUnitTypeId(typeId);
    setErrors(e => ({ ...e, unitType: '' }));
    const t = unitTypes.find(ut => ut.id === typeId);
    if (t) {
      setForm(f => ({
        ...f,
        bedrooms: t.defaultBedrooms != null ? String(t.defaultBedrooms) : f.bedrooms,
        bathrooms: t.defaultBathrooms != null ? String(t.defaultBathrooms) : f.bathrooms,
        squareFeet: t.defaultSquareFeet != null ? String(t.defaultSquareFeet) : f.squareFeet,
      }));
      setAutofilled(true);
    }
  }

  const [saveUnit, { loading }] = useMutation(CREATE_UPDATE_UNIT, {
    refetchQueries: [{ query: UNITS_QUERY }],
    onCompleted(data) {
      if (data?.createUpdateUnit?.success) {
        router.back();
      } else {
        setServerError(data?.createUpdateUnit?.message ?? 'Something went wrong.');
      }
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  function set(field: keyof typeof EMPTY_FORM) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM & { building: string; unitType: string }> = {};
    if (!form.unitNumber.trim()) e.unitNumber = 'Unit number is required';
    if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
    if (!form.monthlyRent.trim()) e.monthlyRent = 'Monthly rent is required';
    if (!form.depositAmount.trim()) e.depositAmount = 'Deposit amount is required';
    if (!selectedBuildingId) e.building = 'Please select a building';
    if (!selectedUnitTypeId) e.unitType = 'Please select a unit type';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    saveUnit({
      variables: {
        ...(isEdit ? { unitId } : {}),
        buildingId: selectedBuildingId || undefined,
        unitType: selectedUnitTypeId || undefined,
        accountNumber: form.accountNumber.trim(),
        unitNumber: form.unitNumber.trim(),
        floor: form.floor.trim() || undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : undefined,
        squareFeet: form.squareFeet ? parseFloat(form.squareFeet) : undefined,
        monthlyRent: parseFloat(form.monthlyRent),
        depositAmount: parseFloat(form.depositAmount),
        serviceCharge: form.serviceCharge ? parseFloat(form.serviceCharge) : undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        description: form.description.trim() || undefined,
        isAvailableForRent: form.isAvailableForRent === 'true',
        isAvailableForPurchase: form.isAvailableForPurchase === 'true',
        paymentPeriod: form.paymentPeriod || undefined,
      },
    });
  }

  if (isEdit && editLoading && !editData) {
    return <LoadingState />;
  }

  return (
    <FormLayout title={isEdit ? 'Edit Unit' : 'Add Unit'}>
      <ServerErrorBanner message={serverError} />

      {/* Building picker — only shown when creating */}
      {!isEdit && (
        <>
          <SectionLabel>Building *</SectionLabel>
          {buildings.length === 0 ? (
            <Text style={styles.hint}>Loading buildings…</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
            >
              {buildings.map(b => {
                const sel = selectedBuildingId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, sel && styles.chipSelected]}
                    onPress={() => { setSelectedBuildingId(b.id); setErrors(e => ({ ...e, building: '' })); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {errors.building ? <Text style={styles.fieldError}>{errors.building}</Text> : null}
        </>
      )}

      {/* Unit type picker with auto-populate */}
      <SectionLabel>Unit type *</SectionLabel>
      {unitTypes.length === 0 ? (
        <Text style={styles.hint}>Loading unit types…</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {unitTypes.map(t => {
            const sel = selectedUnitTypeId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, sel && styles.typeChipSelected]}
                onPress={() => selectUnitType(t.id)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {sel && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                  <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{t.name}</Text>
                </View>
                {(t.defaultBedrooms != null || t.defaultBathrooms != null) && (
                  <Text style={[styles.chipSub, sel && styles.chipSubSelected]}>
                    {t.defaultBedrooms != null ? `${t.defaultBedrooms}bd` : ''}
                    {t.defaultBedrooms != null && t.defaultBathrooms != null ? ' · ' : ''}
                    {t.defaultBathrooms != null ? `${t.defaultBathrooms}ba` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {autofilled && (
        <Text style={styles.autofillHint}>Configuration auto-filled from unit type — you may still edit below.</Text>
      )}
      {errors.unitType ? <Text style={styles.fieldError}>{errors.unitType}</Text> : null}

      <SectionLabel>Basic info</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Unit number *"
          error={errors.unitNumber}
          value={form.unitNumber}
          onChangeText={set('unitNumber')}
          placeholder="e.g. A101"
          autoCapitalize="characters"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Account number *"
          error={errors.accountNumber}
          value={form.accountNumber}
          onChangeText={set('accountNumber')}
          placeholder="e.g. ACC-001"
        />
      </View>

      <Input
        label="Floor"
        value={form.floor}
        onChangeText={set('floor')}
        placeholder="e.g. Ground, 1st, 2nd"
        autoCapitalize="words"
      />

      <SectionLabel>Configuration</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Bedrooms"
          value={form.bedrooms}
          onChangeText={set('bedrooms')}
          placeholder="0"
          keyboardType="number-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Bathrooms"
          value={form.bathrooms}
          onChangeText={set('bathrooms')}
          placeholder="0"
          keyboardType="number-pad"
        />
      </View>

      <Input
        label="Square feet"
        value={form.squareFeet}
        onChangeText={set('squareFeet')}
        placeholder="e.g. 850"
        keyboardType="decimal-pad"
      />

      <SectionLabel>Financial</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Monthly rent *"
          error={errors.monthlyRent}
          value={form.monthlyRent}
          onChangeText={set('monthlyRent')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Deposit amount *"
          error={errors.depositAmount}
          value={form.depositAmount}
          onChangeText={set('depositAmount')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Service charge"
          value={form.serviceCharge}
          onChangeText={set('serviceCharge')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Purchase price"
          value={form.purchasePrice}
          onChangeText={set('purchasePrice')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <SectionLabel>Availability</SectionLabel>

      <View style={styles.toggleSection}>
        <Text style={styles.fieldLabel}>Available for rent</Text>
        <View style={styles.toggleRow}>
          {['true', 'false'].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.toggle, form.isAvailableForRent === v && styles.toggleSelected]}
              onPress={() => set('isAvailableForRent')(v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, form.isAvailableForRent === v && styles.toggleTextSelected]}>
                {v === 'true' ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.toggleSection}>
        <Text style={styles.fieldLabel}>Available for purchase</Text>
        <View style={styles.toggleRow}>
          {['true', 'false'].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.toggle, form.isAvailableForPurchase === v && styles.toggleSelected]}
              onPress={() => set('isAvailableForPurchase')(v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, form.isAvailableForPurchase === v && styles.toggleTextSelected]}>
                {v === 'true' ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.periodSection}>
        <Text style={styles.fieldLabel}>Payment period</Text>
        <View style={styles.periodRow}>
          {PAYMENT_PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.toggle, { flex: 1 }, form.paymentPeriod === p && styles.toggleSelected]}
              onPress={() => set('paymentPeriod')(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, form.paymentPeriod === p && styles.toggleTextSelected]}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionLabel>Notes</SectionLabel>

      <Input
        label="Description"
        value={form.description}
        onChangeText={set('description')}
        placeholder="Additional notes about the unit"
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      <Button
        title={isEdit ? 'Save changes' : 'Add unit'}
        onPress={submit}
        loading={loading}
      />
    </FormLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  row: { flexDirection: 'row' },
  chipScroll: { marginBottom: Spacing.sm },
  chipRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    alignItems: 'center',
  },
  typeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    alignItems: 'center',
    minWidth: 90,
  },
  chipSelected: {
    borderColor: c.primary,
    backgroundColor: c.overlay,
  },
  typeChipSelected: {
    borderColor: c.primary,
    backgroundColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightMedium,
    color: c.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: Typography.fontWeightSemibold,
  },
  chipSub: {
    fontSize: Typography.fontSizeXs,
    color: c.textMuted,
    marginTop: 2,
  },
  chipSubSelected: { color: 'rgba(255,255,255,0.8)' },
  autofillHint: {
    fontSize: Typography.fontSizeXs,
    color: Colors.success,
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  hint: {
    fontSize: Typography.fontSizeSm,
    color: c.textMuted,
    marginBottom: Spacing.md,
  },
  fieldError: {
    fontSize: Typography.fontSizeXs,
    color: Colors.error,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  periodSection: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightMedium,
    color: c.text,
  },
  toggleRow: { flexDirection: 'row', gap: Spacing.xs },
  periodRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  toggle: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.inputBackground,
    alignItems: 'center',
  },
  toggleSelected: {
    borderColor: c.primary,
    backgroundColor: c.overlay,
  },
  toggleText: {
    fontSize: Typography.fontSizeSm,
    color: c.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  toggleTextSelected: {
    color: c.primary,
    fontWeight: Typography.fontWeightSemibold,
  },
  });
}
