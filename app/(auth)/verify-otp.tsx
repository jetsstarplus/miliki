import { useMutation } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { AppColors, Colors, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import {
    RESEND_REGISTRATION_OTP_MUTATION,
    VERIFY_REGISTRATION_OTP_MUTATION,
} from '../../graphql/auth/mutations';

const OTP_LENGTH = 6;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [verifyOtp, { loading }] = useMutation(VERIFY_REGISTRATION_OTP_MUTATION);
  const [resendOtp, { loading: resendLoading }] = useMutation(RESEND_REGISTRATION_OTP_MUTATION);

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => inputRefs.current[0]?.focus(), 400);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleDigitChange(value: string, index: number) {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError('');
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(value: string) {
    // Support pasting a full code into the first box
    const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (cleaned.length === OTP_LENGTH) {
      setDigits(cleaned.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    if (!email) {
      setError('Email not found. Please go back and try again.');
      return;
    }
    try {
      const { data } = await verifyOtp({ variables: { email, code } });
      const result = (data as any)?.verifyRegistrationOtp;
      if (result?.success) {
        Alert.alert(
          'Account Verified!',
          'Your account is now active. Please sign in.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }],
        );
      } else {
        setError(result?.message ?? 'Invalid or expired code. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
    }
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    try {
      const { data } = await resendOtp({ variables: { email } });
      const result = (data as any)?.resendRegistrationOtp;
      if (result?.success) {
        setResent(true);
        startCooldown();
        Alert.alert('Code Sent', 'A new verification code has been sent to your email/phone.');
      } else {
        Alert.alert('Failed', result?.message ?? 'Could not resend code. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend code.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔐</Text>
            </View>
          </View>

          <Text style={styles.title}>Verify your account</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email ?? 'your email'}</Text>
          </Text>

          {/* OTP digit inputs */}
          <View style={styles.otpRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null, error ? styles.otpBoxError : null]}
                value={digit}
                onChangeText={v => {
                  if (v.length > 1) { handlePaste(v); return; }
                  handleDigitChange(v, i);
                }}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete={i === 0 ? 'sms-otp' : 'off'}
              />
            ))}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            title={loading ? 'Verifying…' : 'Verify Account'}
            onPress={handleVerify}
            loading={loading}
            style={{ marginTop: Spacing.lg }}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>{"Didn't receive the code? "}</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendLoading || resendCooldown > 0}
            >
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendLoading
                  ? 'Sending…'
                  : resent
                  ? 'Resent!'
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    backBtn: { marginBottom: Spacing.xl },
    backText: {
      fontSize: Typography.fontSizeMd,
      color: c.primary,
      fontWeight: Typography.fontWeightMedium,
    },
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
    title: {
      fontSize: Typography.fontSize2xl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontSize: Typography.fontSizeMd,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: Spacing.xl,
    },
    emailText: { color: c.primary, fontWeight: Typography.fontWeightSemibold },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    otpBox: {
      width: 46,
      height: 54,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
      textAlign: 'center',
      fontSize: Typography.fontSizeXl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
    },
    otpBoxFilled: { borderColor: c.primary },
    otpBoxError: { borderColor: Colors.error },
    errorText: {
      fontSize: Typography.fontSizeSm,
      color: Colors.error,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
    },
    resendText: { fontSize: Typography.fontSizeMd, color: c.textSecondary },
    resendLink: {
      fontSize: Typography.fontSizeMd,
      color: c.primary,
      fontWeight: Typography.fontWeightSemibold,
    },
    resendDisabled: { color: c.textMuted },
    loginLink: { alignItems: 'center', marginTop: Spacing.sm },
    loginLinkText: { fontSize: Typography.fontSizeMd, color: c.textSecondary },
  });
}
