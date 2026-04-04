import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Spacing } from '@/constants/theme';
import { CREATE_UPDATE_TENANT_MUTATION } from '@/graphql/properties/mutations/tenants';
import { TENANT_DETAIL_QUERY, TENANTS_QUERY } from '@/graphql/properties/queries/tenants';
import { useMutation, useQuery } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  idNumber: '',
  occupation: '',
  employer: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

export default function AddEditTenant() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [serverError, setServerError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});

  // Fetch existing tenant when editing
  const { data: editData, loading: editLoading } = useQuery(TENANT_DETAIL_QUERY, {
    variables: { id },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (editData?.tenant) {
      const t = editData.tenant;
      setForm({
        firstName: t.firstName ?? '',
        middleName: t.middleName ?? '',
        lastName: t.lastName ?? '',
        email: t.email ?? '',
        phone: t.phone ?? '',
        idNumber: t.idNumber ?? '',
        occupation: t.occupation ?? '',
        employer: t.employer ?? '',
        emergencyContactName: t.emergencyContactName ?? '',
        emergencyContactPhone: t.emergencyContactPhone ?? '',
        emergencyContactRelationship: t.emergencyContactRelationship ?? '',
      });
    }
  }, [editData]);

  const [saveTenant, { loading }] = useMutation(CREATE_UPDATE_TENANT_MUTATION, {
    refetchQueries: [{ query: TENANTS_QUERY }],
    onCompleted(data) {
      if (data?.createUpdateTenant?.success) {
        router.back();
      } else {
        setServerError(data?.createUpdateTenant?.message ?? 'Something went wrong.');
      }
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  function set(field: keyof typeof EMPTY_FORM) {
    return (value: string) => {
      setForm(f => ({ ...f, [field]: value }));
      if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    };
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.idNumber.trim()) e.idNumber = 'ID number is required';
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setServerError('');
    saveTenant({
      variables: {
        ...(isEdit ? { id } : {}),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        occupation: form.occupation.trim() || undefined,
        employer: form.employer.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || undefined,
      },
    });
  }

  if (isEdit && editLoading && !editData) {
    return <LoadingState />;
  }

  return (
    <FormLayout title={isEdit ? 'Edit Tenant' : 'Add Tenant'}>
      <ServerErrorBanner message={serverError} />

      <SectionLabel>Personal info</SectionLabel>

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="First name *"
          error={errors.firstName}
          value={form.firstName}
          onChangeText={set('firstName')}
          placeholder="First name"
          autoCapitalize="words"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Last name *"
          error={errors.lastName}
          value={form.lastName}
          onChangeText={set('lastName')}
          placeholder="Last name"
          autoCapitalize="words"
        />
      </View>

      <Input
        label="Middle name"
        value={form.middleName}
        onChangeText={set('middleName')}
        placeholder="Middle name (optional)"
        autoCapitalize="words"
      />

      <Input
        label="National ID number *"
        error={errors.idNumber}
        value={form.idNumber}
        onChangeText={set('idNumber')}
        placeholder="e.g. 12345678"
        keyboardType="number-pad"
      />

      <SectionLabel>Contact</SectionLabel>

      <Input
        label="Phone *"
        error={errors.phone}
        value={form.phone}
        onChangeText={set('phone')}
        placeholder="+254…"
        keyboardType="phone-pad"
      />

      <Input
        label="Email *"
        error={errors.email}
        value={form.email}
        onChangeText={set('email')}
        placeholder="email@example.com"
        keyboardType="email-address"
      />

      <SectionLabel>Employment</SectionLabel>

      <Input
        label="Occupation"
        value={form.occupation}
        onChangeText={set('occupation')}
        placeholder="e.g. Software Engineer"
        autoCapitalize="words"
      />

      <Input
        label="Employer"
        value={form.employer}
        onChangeText={set('employer')}
        placeholder="Company or employer name"
        autoCapitalize="words"
      />

      <SectionLabel>Emergency contact</SectionLabel>

      <Input
        label="Contact name"
        value={form.emergencyContactName}
        onChangeText={set('emergencyContactName')}
        placeholder="Full name"
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <Input
          containerStyle={{ flex: 1 }}
          label="Contact phone"
          value={form.emergencyContactPhone}
          onChangeText={set('emergencyContactPhone')}
          placeholder="+254…"
          keyboardType="phone-pad"
        />
        <View style={{ width: Spacing.sm }} />
        <Input
          containerStyle={{ flex: 1 }}
          label="Relationship"
          value={form.emergencyContactRelationship}
          onChangeText={set('emergencyContactRelationship')}
          placeholder="e.g. Spouse"
          autoCapitalize="words"
        />
      </View>

      <Button
        title={isEdit ? 'Save changes' : 'Add tenant'}
        onPress={submit}
        loading={loading}
        style={{ marginTop: Spacing.lg }}
      />

      <View style={{ height: Spacing.xxl }} />
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
