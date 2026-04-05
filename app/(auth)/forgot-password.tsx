import { useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
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
import { AppColors, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import { SEND_PASSWORD_RESET_EMAIL_MUTATION } from '../../graphql/mutations';

export default function ForgotPassword() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);

  const [sendResetEmail, { loading }] = useMutation(SEND_PASSWORD_RESET_EMAIL_MUTATION);

  async function handleSend() {
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email'); return; }
    setEmailError('');
    try {
      const { data } = await sendResetEmail({ variables: { email: email.trim() } });
      if ((data as any)?.sendPasswordResetEmail?.success) {
        setSent(true);
      } else {
        const msg = (data as any)?.sendPasswordResetEmail?.errors?.email?.[0]?.message ?? 'Failed to send reset email.';
        setEmailError(msg);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{sent ? '🎉' : '🔒'}</Text>
            </View>
          </View>

          {sent ? (
            <>
              <Text style={styles.title}>Email sent!</Text>
              <Text style={styles.subtitle}>
                Check your inbox for a password reset link.{'\n'}
                Follow the instructions to reset your password.
              </Text>
              <Button title="Back to Sign In" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: Spacing.xl }} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                {"Enter your email and we'll send you instructions to reset your password."}
              </Text>
              <Card style={styles.card}>
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoComplete="email"
                  error={emailError}
                />
                <Button title="Send Reset Email" onPress={handleSend} loading={loading} />
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.fontSizeMd, color: c.primary, fontWeight: Typography.fontWeightMedium },
  iconWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.overlay,
    borderWidth: 2,
    borderColor: c.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: c.text, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.fontSizeMd, color: c.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  card: {},
  });
}
