import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { BuildingType } from '@/graphql/properties/enumerators';
import { CREATE_BUILDING_MUTATION } from '@/graphql/properties/mutations/building';
import { BUILDING_DETAIL, BUILDING_LIST } from '@/graphql/properties/queries/building';
import { useMutation, useQuery } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BUILDING_TYPES = [
  { value: BuildingType.RESIDENTIAL, label: 'Residential' },
  { value: BuildingType.COMMERCIAL, label: 'Commercial' },
  { value: BuildingType.MIXED_USE, label: 'Mixed Use' },
];

export default function AddBuilding() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const isEdit = !!buildingId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    buildingType: BuildingType.RESIDENTIAL,
    address: '',
    city: '',
    county: '',
    numberOfFloors: '',
    totalUnits: '',
    yearBuilt: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const { data: editData, loading: editLoading } = useQuery(BUILDING_DETAIL, {
    variables: { id: buildingId },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (editData?.oneBuilding) {
      const b = editData.oneBuilding;
      setForm({
        name: b.name ?? '',
        code: b.code ?? '',
        buildingType: (b.buildingType as BuildingType) ?? BuildingType.RESIDENTIAL,
        address: b.address ?? '',
        city: b.city ?? '',
        county: b.county ?? '',
        numberOfFloors: b.numberOfFloors != null ? String(b.numberOfFloors) : '',
        totalUnits: b.totalUnits != null ? String(b.totalUnits) : '',
        yearBuilt: b.yearBuilt != null ? String(b.yearBuilt) : '',
        managerName: b.managerName ?? '',
        managerPhone: b.managerPhone ?? '',
        managerEmail: b.managerEmail ?? '',
        description: b.description ?? '',
      });
      setCodeManuallyEdited(true);
    }
  }, [editData]);

  const [saveBuilding, { loading }] = useMutation(CREATE_BUILDING_MUTATION, {
    refetchQueries: isEdit
      ? [{ query: BUILDING_DETAIL, variables: { id: buildingId } }, { query: BUILDING_LIST }]
      : [{ query: BUILDING_LIST }],
    onCompleted(data: any) {
      const result = data?.createUpdateBuilding;
      if (result?.success) {
        router.back();
      } else {
        setServerError(result?.message ?? 'Something went wrong.');
      }
    },
    onError(err: any) {
      setServerError(err.message);
    },
  });

  function set(field: keyof typeof form) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function deriveCode(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase();
  }

  function handleNameChange(value: string) {
    setForm(f => ({ ...f, name: value, ...(!codeManuallyEdited ? { code: deriveCode(value) } : {}) }));
    if (errors.name) setErrors(e => ({ ...e, name: '' }));
  }

  function handleCodeChange(value: string) {
    setCodeManuallyEdited(true);
    setForm(f => ({ ...f, code: value }));
    if (errors.code) setErrors(e => ({ ...e, code: '' }));
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.code.trim()) e.code = 'Code is required';
    // if (!form.buildingType) e.buildingType = 'Type is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.numberOfFloors) e.numberOfFloors = 'Number of floors is required';
    if (!form.totalUnits) e.totalUnits = 'Total units is required';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    const variables = {
      name: form.name.trim(),
      code: form.code.trim(),
      buildingType: form.buildingType,
      address: form.address.trim(),
      city: form.city.trim(),
      county: form.county.trim() || undefined,
      numberOfFloors: parseInt(form.numberOfFloors, 10),
      totalUnits: parseInt(form.totalUnits, 10),
      yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt, 10) : undefined,
      managerName: form.managerName.trim() || undefined,
      managerPhone: form.managerPhone.trim() || undefined,
      managerEmail: form.managerEmail.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    saveBuilding({ variables: isEdit ? { id: buildingId, ...variables } : variables });
  }

  if (isEdit && editLoading && !editData) {
    return <LoadingState />;
  }

  return (
    <FormLayout title={isEdit ? 'Edit Building' : 'Add Building'}>
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Basic information</SectionLabel>

      <Input
        label="Building name *"
        error={errors.name}
        value={form.name}
        onChangeText={handleNameChange}
        placeholder="e.g. Sunrise Apartments"
        autoCapitalize="words"
      />

      <Input
        label="Code *"
        error={errors.code}
        value={form.code}
        onChangeText={handleCodeChange}
        placeholder="Auto-generated from name"
        autoCapitalize="characters"
      />

      <View style={{ marginBottom: Spacing.sm }}>
        <Text style={styles.typeLabel}>Building type *</Text>
        <View style={styles.typeRow}>
          {BUILDING_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, form.buildingType === t.value && styles.typeChipActive]}
              onPress={() => set('buildingType')(t.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeChipText, form.buildingType === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.buildingType ? <Text style={styles.typeError}>{errors.buildingType}</Text> : null}
      </View>

      <SectionLabel>Location</SectionLabel>

      <Input
        label="Address *"
        error={errors.address}
        value={form.address}
        onChangeText={set('address')}
        placeholder="Street address"
        autoCapitalize="sentences"
      />

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="City *"
          error={errors.city}
          value={form.city}
          onChangeText={set('city')}
          placeholder="City"
          autoCapitalize="words"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="County"
          error={errors.county}
          value={form.county}
          onChangeText={set('county')}
          placeholder="County"
          autoCapitalize="words"
        />
      </View>

      <SectionLabel>Details</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Floors *"
          error={errors.numberOfFloors}
          value={form.numberOfFloors}
          onChangeText={set('numberOfFloors')}
          placeholder="0"
          keyboardType="number-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Total units *"
          error={errors.totalUnits}
          value={form.totalUnits}
          onChangeText={set('totalUnits')}
          placeholder="0"
          keyboardType="number-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Year built"
          error={errors.yearBuilt}
          value={form.yearBuilt}
          onChangeText={set('yearBuilt')}
          placeholder="e.g. 2010"
          keyboardType="number-pad"
        />
      </View>

      <Input
        label="Description"
        error={errors.description}
        value={form.description}
        onChangeText={set('description')}
        placeholder="Brief description…"
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      <SectionLabel>Property manager</SectionLabel>

      <Input
        label="Name"
        error={errors.managerName}
        value={form.managerName}
        onChangeText={set('managerName')}
        placeholder="Full name"
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Phone"
          error={errors.managerPhone}
          value={form.managerPhone}
          onChangeText={set('managerPhone')}
          placeholder="+254…"
          keyboardType="phone-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Email"
          error={errors.managerEmail}
          value={form.managerEmail}
          onChangeText={set('managerEmail')}
          placeholder="email@…"
          keyboardType="email-address"
        />
      </View>

      <Button
        title={isEdit ? 'Save changes' : 'Add building'}
        onPress={submit}
        loading={loading}
        style={{ marginTop: Spacing.lg }}
      />

      <View style={{ height: Spacing.xxl }} />
    </FormLayout>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  typeLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightMedium,
    color: c.text,
    marginBottom: 6,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  typeChipText: {
    fontSize: Typography.fontSizeXs,
    color: c.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  typeChipTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  typeError: { fontSize: Typography.fontSizeXs, color: Colors.error, marginTop: 4 },
  });
}
