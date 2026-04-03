import { useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { CREATE_BUILDING_MUTATION } from '@/graphql/mutations';
import { BUILDING_LIST } from '@/graphql/properties/queries/building';

const BUILDING_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'OTHER', label: 'Other' },
];

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && { height: (numberOfLines ?? 3) * 22, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      autoCapitalize="sentences"
    />
  );
}

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Building</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {serverError ? (
            <View style={styles.serverError}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}

          {/* ── Basic info ── */}
          <Text style={styles.section}>Basic information</Text>

          <Field label="Building name" required error={errors.name}>
            <Input value={form.name} onChangeText={set('name')} placeholder="e.g. Sunrise Apartments" />
          </Field>

          <Field label="Code / Reference" error={errors.code}>
            <Input value={form.code} onChangeText={set('code')} placeholder="e.g. BLD-001" />
          </Field>

          <Field label="Building type" required error={errors.buildingType}>
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
          </Field>

          {/* ── Location ── */}
          <Text style={styles.section}>Location</Text>

          <Field label="Address" required error={errors.address}>
            <Input value={form.address} onChangeText={set('address')} placeholder="Street address" />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="City" required error={errors.city}>
                <Input value={form.city} onChangeText={set('city')} placeholder="City" />
              </Field>
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Field label="County" error={errors.county}>
                <Input value={form.county} onChangeText={set('county')} placeholder="County" />
              </Field>
            </View>
          </View>

          {/* ── Details ── */}
          <Text style={styles.section}>Details</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Floors" error={errors.numberOfFloors}>
                <Input value={form.numberOfFloors} onChangeText={set('numberOfFloors')} placeholder="0" keyboardType="number-pad" />
              </Field>
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Field label="Year built" error={errors.yearBuilt}>
                <Input value={form.yearBuilt} onChangeText={set('yearBuilt')} placeholder="e.g. 2010" keyboardType="number-pad" />
              </Field>
            </View>
          </View>

          <Field label="Description" error={errors.description}>
            <Input value={form.description} onChangeText={set('description')} placeholder="Brief description…" multiline numberOfLines={3} />
          </Field>

          {/* ── Manager ── */}
          <Text style={styles.section}>Property manager</Text>

          <Field label="Name" error={errors.managerName}>
            <Input value={form.managerName} onChangeText={set('managerName')} placeholder="Full name" />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Phone" error={errors.managerPhone}>
                <Input value={form.managerPhone} onChangeText={set('managerPhone')} placeholder="+254…" keyboardType="phone-pad" />
              </Field>
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Field label="Email" error={errors.managerEmail}>
                <Input value={form.managerEmail} onChangeText={set('managerEmail')} placeholder="email@…" keyboardType="email-address" />
              </Field>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Add building</Text>
            }
          </TouchableOpacity>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.text,
  },

  scroll: { padding: Spacing.md },

  serverError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  serverErrorText: { flex: 1, fontSize: Typography.fontSizeSm, color: Colors.error },

  section: {
    fontSize: 11,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  field: { marginBottom: Spacing.sm },
  label: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: Colors.text, marginBottom: 6 },
  required: { color: Colors.error },
  fieldError: { fontSize: Typography.fontSizeXs, color: Colors.error, marginTop: 4 },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    ...Shadow.sm,
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
  typeChipText: { fontSize: Typography.fontSizeXs, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium },
  typeChipTextActive: { color: '#fff' },

  row: { flexDirection: 'row' },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadow.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold },
});
