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
import { useAuth } from '../../context/auth';
import { LOGIN_MUTATION } from '../../graphql/mutations';
import { parseGqlErrors } from '../../lib/gql-errors';

interface LoginErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const router = useRouter();
  const { signIn, setActiveCompany } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});

  const [tokenAuth, { loading }] = useMutation(LOGIN_MUTATION);

  function validate(): boolean {
    const errs: LoginErrors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      const { data } = await tokenAuth({ variables: { email: email.trim(), password } });
      const result = (data as any)?.tokenAuth;
      if (result?.success && result?.token) {
        await signIn(result.token, result.refreshToken ?? '', result.user);
        const companies = result.user?.companyMemberships?.edges ?? [];
        if (companies.length > 0) {
          if (result.user?.preferences?.lastCompanyId) {
            const lastId = String(result.user.preferences.lastCompanyId);
            const active = companies.find((c: any) => {
              const relayId: string = c.node.company.id ?? '';
              // Relay encodes IDs as base64("TypeName:rawId") — decode and extract the raw part
              try {
                const decoded = atob(relayId).split(':').pop() ?? '';
                return decoded === lastId;
              } catch {
                return relayId === lastId;
              }
            });
            if (active) await setActiveCompany(active.node.company);
            else await setActiveCompany(companies[0].node.company);
          } else {
            const firstCompany = companies[0]?.node?.company;
            if (firstCompany) await setActiveCompany(firstCompany);
          }
          router.replace('/(tabs)/home' as any);
        } else {
          router.replace('/(onboarding)/create-company');
        }
      } else {
        Alert.alert('Sign In Failed', parseGqlErrors(result?.errors, 'Invalid credentials. Please try again.'));
      }
    } catch (e: any) {
      const msg = e?.networkError ? 'Network error. Please check your connection.' : (e?.message ?? 'Something went wrong. Please try again.');
      Alert.alert('Error', msg);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Image
              source={require('../../assets/images/favicons/logo-1.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <Card style={styles.card}>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="password"
              error={fieldErrors.password}
            />

            <TouchableOpacity
              style={styles.forgotWrap}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button title="Sign In" onPress={handleLogin} loading={loading} />
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{'Don\'t have an account? '}</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/register')}
            >
              Create one
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
  header: { paddingTop: Spacing.md, paddingBottom: Spacing.xl, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
  backText: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  logoSmall: {
    width: 64,
    height: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize2xl,
    fontWeight: Typography.fontWeightBold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  card: { marginBottom: Spacing.lg },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -Spacing.xs, marginBottom: Spacing.md },
  forgotText: { fontSize: Typography.fontSizeSm, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingTop: Spacing.sm },
  footerText: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
});
