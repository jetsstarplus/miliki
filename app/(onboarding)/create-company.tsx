import { useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SelectCard } from '../../components/ui/SelectCard';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { CREATE_COMPANY_MUTATION } from '@/graphql/companies/mutations';
import { parseGqlErrors } from '../../lib/gql-errors';

const COMPANY_TYPE_OPTIONS = [
  { label: '🏠 Landlord', value: 'LANDLORD' },
  { label: '🏢 Agent', value: 'AGENT' },
];

const STEPS = ['Company Type', 'Basic Info', 'Location'];

interface FormState {
  companyType: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  county: string;
  physicalAddress: string;
  registrationNumber: string;
  taxNumber: string;
}

interface FormErrors {
  companyType?: string;
  name?: string;
  email?: string;
}

export default function CreateCompany() {
  const router = useRouter();
  const { setActiveCompany, signOut } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    companyType: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    county: '',
    physicalAddress: '',
    registrationNumber: '',
    taxNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [createCompany, { loading }] = useMutation(CREATE_COMPANY_MUTATION);

  function set(field: keyof FormState) {
    return (val: string) => setForm(f => ({ ...f, [field]: val }));
  }

  function validateStep(): boolean {
    const e: FormErrors = {};
    if (step === 0 && !form.companyType) e.companyType = 'Please select a company type';
    if (step === 1) {
      if (!form.name.trim()) e.name = 'Company name is required';
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  }

  async function handleSubmit() {
    try {
      const { data } = await createCompany({
        variables: {
          companyType: form.companyType,
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          county: form.county.trim() || undefined,
          physicalAddress: form.physicalAddress.trim() || undefined,
          registrationNumber: form.registrationNumber.trim() || undefined,
          taxNumber: form.taxNumber.trim() || undefined,
        },
      });
      const result = (data as any)?.createCompany;
      if (result?.success && result?.company) {
        await setActiveCompany(result.company);
        router.replace('/(tabs)/home' as any);
      } else {
        Alert.alert('Failed', parseGqlErrors(result?.errors, result?.message ?? 'Could not create company. Please try again.'));
      }
    } catch (e: any) {
      const msg = e?.networkError ? 'Network error. Please check your connection.' : (e?.message ?? 'Something went wrong.');
      Alert.alert('Error', msg);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/favicons/logo-1.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.title}>Set up your company</Text>
            <Text style={styles.subtitle}>This will be your property management workspace</Text>
          </View>

          {/* Progress steps */}
          <View style={styles.stepsRow}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <View style={styles.stepWrap}>
                  <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
                    {i < step ? (
                      <Text style={styles.stepCheck}>✓</Text>
                    ) : (
                      <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{s}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Step 0: Company Type */}
          {step === 0 && (
            <Card style={styles.card}>
              <Text style={styles.stepTitle}>What type of company are you setting up?</Text>
              <SelectCard
                options={COMPANY_TYPE_OPTIONS}
                value={form.companyType}
                onChange={set('companyType')}
                error={errors.companyType}
              />
              <View style={styles.typeDesc}>
                {form.companyType === 'LANDLORD' && (
                  <Text style={styles.typeDescText}>
                    As a <Text style={styles.bold}>Landlord</Text>, you own properties and manage them directly.
                  </Text>
                )}
                {form.companyType === 'AGENT' && (
                  <Text style={styles.typeDescText}>
                    As an <Text style={styles.bold}>Agent</Text>, you manage properties on behalf of owners.
                  </Text>
                )}
              </View>
            </Card>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card style={styles.card}>
              <Text style={styles.stepTitle}>Company details</Text>
              <Input
                label="Company Name *"
                placeholder="e.g. Sunrise Properties Ltd"
                value={form.name}
                onChangeText={set('name')}
                error={errors.name}
              />
              <Input
                label="Company Email"
                placeholder="info@company.com"
                value={form.email}
                onChangeText={set('email')}
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Phone Number"
                placeholder="+254 700 000 000"
                value={form.phone}
                onChangeText={set('phone')}
                keyboardType="phone-pad"
              />
              <Input
                label="Registration Number"
                placeholder="Company reg. no. (optional)"
                value={form.registrationNumber}
                onChangeText={set('registrationNumber')}
              />
              <Input
                label="Tax Number (KRA PIN)"
                placeholder="Tax / KRA PIN (optional)"
                value={form.taxNumber}
                onChangeText={set('taxNumber')}
              />
            </Card>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <Card style={styles.card}>
              <Text style={styles.stepTitle}>Where are you located?</Text>
              <Input
                label="Country"
                placeholder="e.g. Kenya"
                value={form.country}
                onChangeText={set('country')}
              />
              <Input
                label="County / State"
                placeholder="e.g. Nairobi"
                value={form.county}
                onChangeText={set('county')}
              />
              <Input
                label="City / Town"
                placeholder="e.g. Westlands"
                value={form.city}
                onChangeText={set('city')}
              />
              <Input
                label="Physical Address"
                placeholder="Street address"
                value={form.physicalAddress}
                onChangeText={set('physicalAddress')}
                multiline
                numberOfLines={2}
              />
            </Card>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 0 && (
              <Button
                title="Back"
                variant="outline"
                fullWidth={false}
                onPress={() => setStep(s => s - 1)}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={step === STEPS.length - 1 ? 'Create Company' : 'Continue'}
              onPress={handleNext}
              loading={loading && step === STEPS.length - 1}
              fullWidth={false}
              style={{ flex: 1 }}
            />
          </View>

          {step === 0 && (
            <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },

  header: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  logoSmall: { width: 64, height: 64, marginBottom: Spacing.md },
  title: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary, textAlign: 'center' },

  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  stepWrap: { alignItems: 'center', gap: Spacing.xs },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.borderLight,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.overlay },
  stepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepNum: { fontSize: Typography.fontSizeSm, color: Colors.textMuted, fontWeight: Typography.fontWeightMedium },
  stepNumActive: { color: Colors.primary },
  stepCheck: { fontSize: Typography.fontSizeSm, color: '#fff', fontWeight: Typography.fontWeightBold },
  stepLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.fontWeightMedium, marginTop: 2 },
  stepLabelActive: { color: Colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.borderLight, marginBottom: 16, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },

  card: { marginBottom: Spacing.lg },
  stepTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginBottom: Spacing.lg },

  typeDesc: { marginTop: Spacing.sm },
  typeDescText: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, lineHeight: 20 },
  bold: { fontWeight: Typography.fontWeightSemibold, color: Colors.text },

  navRow: { flexDirection: 'row', gap: Spacing.sm },

  signOutBtn: { alignItems: 'center', marginTop: Spacing.xl },
  signOutText: { fontSize: Typography.fontSizeSm, color: Colors.textMuted },
});
