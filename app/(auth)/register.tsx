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
import { Colors, Spacing, Typography } from '../../constants/theme';
import { REGISTER_MUTATION } from '../../graphql/mutations';
import { parseGqlErrors } from '../../lib/gql-errors';

interface RegErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password1?: string;
  password2?: string;
}

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password1: '',
    password2: '',
  });
  const [errors, setErrors] = useState<RegErrors>({});

  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  function set(field: keyof typeof form) {
    return (val: string) => setForm(f => ({ ...f, [field]: val }));
  }

  function validate(): boolean {
    const e: RegErrors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!form.password1) e.password1 = 'Password is required';
    else if (form.password1.length < 8) e.password1 = 'Password must be at least 8 characters';
    if (form.password1 !== form.password2) e.password2 = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      const { data } = await register({
        variables: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
          password1: form.password1,
          password2: form.password2,
        },
      });
      const result = (data as any)?.register;
      if (result?.success) {
        router.push({ pathname: '/(auth)/verify', params: { email: form.email.trim() } });
      } else {
        Alert.alert('Registration Failed', parseGqlErrors(result?.errors, 'Please check your details and try again.'));
      }
    } catch (e: any) {
      const msg = e?.networkError ? 'Network error. Please check your connection.' : (e?.message ?? 'Something went wrong. Please try again.');
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Image
              source={require('../../assets/images/favicons/logo-1.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start managing your properties today</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label="First Name"
                  placeholder="John"
                  value={form.firstName}
                  onChangeText={set('firstName')}
                  autoComplete="given-name"
                  error={errors.firstName}
                  containerStyle={{ marginBottom: Spacing.md }}
                />
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={form.lastName}
                  onChangeText={set('lastName')}
                  autoComplete="family-name"
                  error={errors.lastName}
                  containerStyle={{ marginBottom: Spacing.md }}
                />
              </View>
            </View>

            <Input
              label="Email Address"
              placeholder="john@example.com"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Username"
              placeholder="john_doe"
              value={form.username}
              onChangeText={set('username')}
              autoComplete="username"
              error={errors.username}
            />

            <Input
              label="Password"
              placeholder="Min. 8 characters"
              value={form.password1}
              onChangeText={set('password1')}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              error={errors.password1}
            />

            <Input
              label="Confirm Password"
              placeholder="Repeat password"
              value={form.password2}
              onChangeText={set('password2')}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              error={errors.password2}
            />

            <Button title="Create Account" onPress={handleRegister} loading={loading} />

            <Text style={styles.terms}>
              By creating an account you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.footerLink} onPress={() => router.push('/(auth)/login')}>
              Sign In
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  header: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  logoSmall: { width: 64, height: 64, marginBottom: Spacing.md },
  backText: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  title: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  card: { marginBottom: Spacing.lg },
  row: { flexDirection: 'row' },
  terms: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingTop: Spacing.sm },
  footerText: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
});
