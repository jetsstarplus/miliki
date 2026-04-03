import { useMutation } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
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
import { RESEND_ACTIVATION_EMAIL_MUTATION, VERIFY_ACCOUNT_MUTATION } from '../../graphql/mutations';

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [resent, setResent] = useState(false);

  const [verifyAccount, { loading }] = useMutation(VERIFY_ACCOUNT_MUTATION);
  const [resendEmail, { loading: resendLoading }] = useMutation(RESEND_ACTIVATION_EMAIL_MUTATION);

  async function handleVerify() {
    if (!token.trim()) {
      setTokenError('Please enter the verification token');
      return;
    }
    setTokenError('');
    try {
      const { data } = await verifyAccount({ variables: { token: token.trim() } });
      if ((data as any)?.verifyAccount?.success) {
        Alert.alert(
          'Email Verified!',
          'Your account is now active. Please sign in.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        const msg = (data as any)?.verifyAccount?.errors?.nonFieldErrors?.[0]?.message ?? 'Invalid or expired token.';
        setTokenError(msg);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Verification failed.');
    }
  }

  async function handleResend() {
    if (!email) return;
    try {
      await resendEmail({ variables: { email } });
      setResent(true);
      Alert.alert('Email Sent', 'A new verification email has been sent.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend email.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>✉️</Text>
            </View>
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to{'\n'}
            <Text style={styles.emailText}>{email ?? 'your email'}</Text>
          </Text>
          <Text style={styles.hint}>
            Copy the token from the email and enter it below.
          </Text>

          <Card style={styles.card}>
            <Input
              label="Verification Token"
              placeholder="Paste token from email"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              error={tokenError}
            />
            <Button title="Verify Account" onPress={handleVerify} loading={loading} />
          </Card>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>{'Didn\'t receive the email? '}</Text>
            <TouchableOpacity onPress={handleResend} disabled={resendLoading || resent}>
              <Text style={[styles.resendLink, resent && styles.resendSent]}>
                {resent ? 'Sent!' : resendLoading ? 'Sending…' : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>Go back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  iconWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.overlay,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.sm },
  emailText: { color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  hint: { fontSize: Typography.fontSizeSm, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  card: { marginBottom: Spacing.lg },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.md },
  resendText: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  resendLink: { fontSize: Typography.fontSizeMd, color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  resendSent: { color: Colors.success },
  loginLink: { alignItems: 'center', marginTop: Spacing.sm },
  loginLinkText: { fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
});
