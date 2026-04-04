import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { CREATE_BUILDING_MUTATION } from '@/graphql/properties/mutations/building';
import { BUILDING_LIST } from '@/graphql/properties/queries/building';
import { useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BUILDING_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'OTHER', label: 'Other' },
];

export default function AddBuilding() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    buildingType: 'RESIDENTIAL',
    address: '',
    city: '',
    county: '',
    numberOfFloors: '',
    yearBuilt: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const [createBuilding, { loading }] = useMutation(CREATE_BUILDING_MUTATION, {
    refetchQueries: [{ query: BUILDING_LIST }],
    onCompleted(data) {
      if (data?.createBuilding?.success) {
        router.back();
      } else {
        setServerError(data?.createBuilding?.message ?? 'Something went wrong.');
      }
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  function set(field: keyof typeof form) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.buildingType) e.buildingType = 'Type is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    createBuilding({
      variables: {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        buildingType: form.buildingType,
        address: form.address.trim(),
        city: form.city.trim(),
        county: form.county.trim() || undefined,
        numberOfFloors: form.numberOfFloors ? parseInt(form.numberOfFloors, 10) : undefined,
        yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt, 10) : undefined,
        managerName: form.managerName.trim() || undefined,
        managerPhone: form.managerPhone.trim() || undefined,
        managerEmail: form.managerEmail.trim() || undefined,
        description: form.description.trim() || undefined,
      },
    });
  }

  return (
    <FormLayout title="Add Building">
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Basic information</SectionLabel>

      <Input
        label="Building name *"
        error={errors.name}
        value={form.name}
        onChangeText={set('name')}
        placeholder="e.g. Sunrise Apartments"
        autoCapitalize="words"
      />

      <Input
        label="Code / Reference"
        error={errors.code}
        value={form.code}
        onChangeText={set('code')}
        placeholder="e.g. BLD-001"
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
          label="Floors"
          error={errors.numberOfFloors}
          value={form.numberOfFloors}
          onChangeText={set('numberOfFloors')}
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
        title="Add building"
        onPress={submit}
        loading={loading}
        style={{ marginTop: Spacing.lg }}
      />

      <View style={{ height: Spacing.xxl }} />
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  typeLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.text,
    marginBottom: 6,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  typeChipTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  typeError: { fontSize: Typography.fontSizeXs, color: Colors.error, marginTop: 4 },
});
