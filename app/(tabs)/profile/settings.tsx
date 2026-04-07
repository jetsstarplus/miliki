import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { UPDATE_COMPANY_MUTATION } from '@/graphql/companies/mutations';
import { COMPANY_DETAIL_QUERY } from '@/graphql/queries';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CompanyForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  county: string;
  country: string;
  physicalAddress: string;
  registrationNumber: string;
  taxNumber: string;
};

const EMPTY_FORM: CompanyForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  county: '',
  country: '',
  physicalAddress: '',
  registrationNumber: '',
  taxNumber: '',
};

export default function Settings() {
  const { activeCompany, setActiveCompany } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<CompanyForm>>({});
  const [serverError, setServerError] = useState('');

  const { data, loading: queryLoading } = useQuery(COMPANY_DETAIL_QUERY, {
    variables: { id: activeCompany?.id },
    skip: !activeCompany?.id,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const c = (data as any)?.company;
    if (c) {
      setForm({
        name: c.name ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        city: c.city ?? '',
        county: c.county ?? '',
        country: c.country ?? '',
        physicalAddress: c.physicalAddress ?? '',
        registrationNumber: c.registrationNumber ?? '',
        taxNumber: c.taxNumber ?? '',
      });
    }
  }, [data]);

  const [updateCompany, { loading }] = useMutation(UPDATE_COMPANY_MUTATION, {
    refetchQueries: [{ query: COMPANY_DETAIL_QUERY, variables: { id: activeCompany?.id } }],
  });

  function field(key: keyof CompanyForm) {
    return {
      value: form[key],
      onChangeText: (v: string) => {
        setForm(f => ({ ...f, [key]: v }));
        setErrors(e => ({ ...e, [key]: undefined }));
      },
    };
  }

  function validate() {
    const e: Partial<CompanyForm> = {};
    if (!form.name.trim()) e.name = 'Company name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.country.trim()) e.country = 'Country is required';
    if (!form.physicalAddress.trim()) e.physicalAddress = 'Physical address is required';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setServerError('');

    try {
      const { data: result } = await updateCompany({
        variables: {
          companyId: activeCompany?.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          county: form.county.trim() || null,
          country: form.country.trim(),
          physicalAddress: form.physicalAddress.trim(),
          registrationNumber: form.registrationNumber.trim() || null,
          taxNumber: form.taxNumber.trim() || null,
        },
      });

      const payload = (result as any)?.updateCompany;
      if (payload?.success) {
        const updated = payload.company;
        if (updated && activeCompany) {
          await setActiveCompany({ ...activeCompany, name: updated.name, email: updated.email });
        }
        Alert.alert('Saved', 'Company details updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        setServerError(payload?.message ?? 'Failed to update company.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
  }

  if (queryLoading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Company Settings" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safe.backgroundColor} />
      <AppHeader title="Company Settings" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {serverError ? <ServerErrorBanner message={serverError} /> : null}

          {/* Basic info */}
          <SectionLabel>Basic Information</SectionLabel>
          <View style={styles.card}>
            <Input
              label="Company Name"
              placeholder="Enter company name"
              error={errors.name}
              {...field('name')}
            />
            <Input
              label="Email"
              placeholder="company@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              {...field('email')}
            />
            <Input
              label="Phone"
              placeholder="+254 700 000 000"
              keyboardType="phone-pad"
              error={errors.phone}
              {...field('phone')}
            />
          </View>

          {/* Location */}
          <SectionLabel>Location</SectionLabel>
          <View style={styles.card}>
            <Input
              label="Physical Address"
              placeholder="Street address"
              error={errors.physicalAddress}
              {...field('physicalAddress')}
            />
            <Input
              label="City"
              placeholder="e.g. Nairobi"
              error={errors.city}
              {...field('city')}
            />
            <Input
              label="County / Region"
              placeholder="e.g. Nairobi County"
              {...field('county')}
            />
            <Input
              label="Country"
              placeholder="e.g. Kenya"
              error={errors.country}
              {...field('country')}
            />
          </View>

          {/* Legal */}
          <SectionLabel>Legal</SectionLabel>
          <View style={styles.card}>
            <Input
              label="Registration Number"
              placeholder="Business reg. number (optional)"
              {...field('registrationNumber')}
            />
            <Input
              label="Tax Number"
              placeholder="KRA PIN / VAT number (optional)"
              {...field('taxNumber')}
            />
          </View>

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...Shadow.sm,
      gap: Spacing.xs,
    },

    saveBtn: { marginTop: Spacing.xs },
  });
}
