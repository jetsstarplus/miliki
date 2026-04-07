import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { PASSWORD_CHANGE_MUTATION } from '@/graphql/mutations';
import { useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePassword() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [form, setForm] = useState({ oldPassword: '', newPassword1: '', newPassword2: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState('');

  const [passwordChange, { loading }] = useMutation(PASSWORD_CHANGE_MUTATION);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.oldPassword) e.oldPassword = 'Current password is required';
    if (!form.newPassword1) e.newPassword1 = 'New password is required';
    else if (form.newPassword1.length < 8) e.newPassword1 = 'Password must be at least 8 characters';
    if (!form.newPassword2) e.newPassword2 = 'Please confirm your new password';
    else if (form.newPassword1 !== form.newPassword2) e.newPassword2 = 'Passwords do not match';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setServerError('');

    try {
      const { data } = await passwordChange({
        variables: {
          oldPassword: form.oldPassword,
          newPassword1: form.newPassword1,
          newPassword2: form.newPassword2,
        },
      });

      const result = (data as any)?.passwordChange;
      if (result?.success) {
        Alert.alert('Password Changed', 'Your password has been updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const errObj = result?.errors;
        if (errObj) {
          const msg =
            errObj?.oldPassword?.[0]?.message ??
            errObj?.newPassword2?.[0]?.message ??
            errObj?.nonFieldErrors?.[0]?.message ??
            'Failed to change password.';
          setServerError(msg);
        } else {
          setServerError('Failed to change password.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safe.backgroundColor} />
      <AppHeader title="Change Password" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
            </View>
            <Text style={styles.subtitle}>
              Enter your current password and choose a new one.
            </Text>
          </View>

          {serverError ? <ServerErrorBanner message={serverError} /> : null}

          <View style={styles.card}>
            <Input
              label="Current Password"
              placeholder="Enter current password"
              value={form.oldPassword}
              onChangeText={(v) => { setForm(f => ({ ...f, oldPassword: v })); setErrors(e => ({ ...e, oldPassword: undefined })); }}
              secureTextEntry
              autoComplete="password"
              error={errors.oldPassword}
            />
            <View style={styles.divider} />
            <Input
              label="New Password"
              placeholder="At least 8 characters"
              value={form.newPassword1}
              onChangeText={(v) => { setForm(f => ({ ...f, newPassword1: v })); setErrors(e => ({ ...e, newPassword1: undefined })); }}
              secureTextEntry
              autoComplete="new-password"
              error={errors.newPassword1}
            />
            <Input
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={form.newPassword2}
              onChangeText={(v) => { setForm(f => ({ ...f, newPassword2: v })); setErrors(e => ({ ...e, newPassword2: undefined })); }}
              secureTextEntry
              autoComplete="new-password"
              error={errors.newPassword2}
            />
          </View>

          <Button
            title="Update Password"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
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

    iconWrap: { alignItems: 'center', marginVertical: Spacing.xl },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
      ...Shadow.sm,
    },
    subtitle: {
      fontSize: Typography.fontSizeMd,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      ...Shadow.sm,
      gap: Spacing.xs,
    },
    divider: { height: Spacing.sm },

    submitBtn: { marginTop: Spacing.lg },
  });
}
