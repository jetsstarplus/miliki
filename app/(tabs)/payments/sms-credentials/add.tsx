import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { Input } from '@/components/ui/Input';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { CREATE_UPDATE_SMS_CREDENTIAL, DELETE_SMS_CREDENTIAL } from '@/graphql/properties/mutations/sms';
import { SMS_CREDENTIAL_DETAIL, SMS_CREDENTIALS_QUERY } from '@/graphql/properties/queries/sms';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useSmsReader } from '@/hooks/useSmsReader';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FormState {
  name: string;
  expectedSender: string;
  sourcePhoneNumber: string;
  sourceShortcode: string;
  referenceKeyword: string;
  amountKeyword: string;
  syncEndpoint: string;
  isActive: boolean;
  autoRead: boolean;
  intervalMinutes: string;
}

const DEFAULTS: FormState = {
  name: '',
  expectedSender: '',
  sourcePhoneNumber: '',
  sourceShortcode: '',
  referenceKeyword: '',
  amountKeyword: '',
  syncEndpoint: '',
  isActive: true,
  autoRead: false,
  intervalMinutes: '15',
};

export default function AddSmsCredential() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { deviceId, ready: deviceReady } = useDeviceId();

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');

  // Fetch existing credential for edit
  const { data: editData, loading: editLoading } = useQuery(SMS_CREDENTIAL_DETAIL, {
    variables: { id },
    skip: !isEdit,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!isEdit || !editData?.smsReceiptCredential) return;
    const c = editData.smsReceiptCredential;
    let autoRead = false;
    let intervalMinutes = '15';
    try {
      const cfg = typeof c.readerConfig === 'string' ? JSON.parse(c.readerConfig) : (c.readerConfig ?? {});
      autoRead = Boolean(cfg.autoRead);
      intervalMinutes = String(cfg.intervalMinutes ?? 15);
    } catch { /* keep defaults */ }
    setForm({
      name: c.name ?? '',
      expectedSender: c.expectedSender ?? '',
      sourcePhoneNumber: c.sourcePhoneNumber ?? '',
      sourceShortcode: c.sourceShortcode ?? '',
      referenceKeyword: c.referenceKeyword ?? '',
      amountKeyword: c.amountKeyword ?? '',
      syncEndpoint: c.syncEndpoint ?? '',
      isActive: c.isActive ?? true,
      autoRead,
      intervalMinutes,
    });
  }, [isEdit, editData]);

  const [createUpdate, { loading: saving }] = useMutation(CREATE_UPDATE_SMS_CREDENTIAL, {
    refetchQueries: [{ query: SMS_CREDENTIALS_QUERY, variables: { first: 100 } }],
  });

  const [deleteCredential, { loading: deleting }] = useMutation(DELETE_SMS_CREDENTIAL, {
    refetchQueries: [{ query: SMS_CREDENTIALS_QUERY, variables: { first: 100 } }],
  });

  const setField = (key: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Policy name is required.';
    if (!form.expectedSender.trim() && !form.sourceShortcode.trim() && !form.sourcePhoneNumber.trim()) {
      e.expectedSender = 'At least one sender identifier is required (Sender ID, shortcode, or phone).';
    }
    const interval = parseInt(form.intervalMinutes, 10);
    if (form.autoRead && (!interval || interval < 1)) {
      e.intervalMinutes = 'Enter a valid interval (minimum 1 minute).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setServerError('');
    try {
      const readerConfig = {
        autoRead: form.autoRead,
        intervalMinutes: parseInt(form.intervalMinutes, 10) || 15,
      };
      const res = await createUpdate({
        variables: {
          ...(isEdit ? { id } : {}),
          name: form.name.trim(),
          expectedSender: form.expectedSender.trim() || null,
          sourcePhoneNumber: form.sourcePhoneNumber.trim() || null,
          sourceShortcode: form.sourceShortcode.trim() || null,
          referenceKeyword: form.referenceKeyword.trim() || null,
          amountKeyword: form.amountKeyword.trim() || null,
          syncEndpoint: form.syncEndpoint.trim() || null,
          deviceIdentifier: deviceId || null,
          isActive: form.isActive,
          readerConfig,
        },
      });
      const result = res.data?.createUpdateSmsReceiptCredential;
      if (result?.success) {
        router.back();
      } else {
        setServerError(result?.message ?? 'Save failed. Please try again.');
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Something went wrong.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Policy',
      `Delete "${form.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCredential({ variables: { id } });
              if (res.data?.deleteSmsReceiptCredential?.success) {
                router.back();
              } else {
                Alert.alert('Error', res.data?.deleteSmsReceiptCredential?.message ?? 'Delete failed.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Something went wrong.');
            }
          },
        },
      ],
    );
  };

  // For the manual "Read Now" on the edit form
  const credentialForReader = isEdit && editData?.smsReceiptCredential
    ? {
        id,
        syncEndpoint: form.syncEndpoint || null,
        expectedSender: form.expectedSender || null,
        sourceShortcode: form.sourceShortcode || null,
        sourcePhoneNumber: form.sourcePhoneNumber || null,
      }
    : null;

  const { triggerRead, reading, permissionGranted, requestPermission, isSupported, isIOS } = useSmsReader({
    credential: credentialForReader as any,
    readerConfig: { autoRead: false, intervalMinutes: 15 },
  });

  return (
    <FormLayout
      title={isEdit ? 'Edit Read Policy' : 'New Read Policy'}
      rightElement={
        isEdit ? (
          <TouchableOpacity onPress={handleDelete} disabled={deleting} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        ) : undefined
      }
    >
      {serverError ? <ServerErrorBanner message={serverError} /> : null}

      {/* Device Info */}
      <View style={styles.deviceRow}>
        <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceLabel}>Device ID (auto-assigned)</Text>
          <Text style={styles.deviceId} numberOfLines={1} selectable>
            {deviceReady ? (deviceId || 'Loading…') : 'Loading…'}
          </Text>
        </View>
        {Platform.OS === 'android' && (
          <View style={[styles.permBadge, permissionGranted === true ? styles.permGranted : styles.permDenied]}>
            <Text style={[styles.permBadgeText, permissionGranted === true ? styles.permGrantedText : styles.permDeniedText]}>
              {permissionGranted === null ? 'Checking…' : permissionGranted ? 'SMS ✓' : 'No SMS perm'}
            </Text>
          </View>
        )}
      </View>

      {/* Android SMS permission request */}
      {Platform.OS === 'android' && permissionGranted === false && (
        <TouchableOpacity style={styles.permBanner} onPress={requestPermission} activeOpacity={0.8}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.permBannerText}>
            SMS read permission not granted. Tap to request.
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
        </TouchableOpacity>
      )}

      {Platform.OS === 'ios' && (
        <View style={[styles.permBanner, { borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.permBannerText, { color: colors.textSecondary }]}>
            Automatic SMS reading is Android-only. On iOS, messages must be submitted via the sync endpoint.
          </Text>
        </View>
      )}

      {/* Basic Info */}
      <SectionLabel>Basic Info</SectionLabel>

      <Input
        label="Policy Name *"
        placeholder="e.g. Equity Bank Payment Alerts"
        value={form.name}
        onChangeText={(v) => setField('name', v)}
        error={errors.name}
      />

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Active</Text>
          <Text style={styles.toggleSub}>Enable this policy to process incoming SMS</Text>
        </View>
        <Switch
          value={form.isActive}
          onValueChange={(v) => setField('isActive', v)}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={form.isActive ? colors.primary : colors.textMuted}
        />
      </View>

      {/* SMS Source */}
      <SectionLabel>SMS Source</SectionLabel>

      <Input
        label="Expected Sender ID"
        placeholder="e.g. EQUITY, MPESA, KCB"
        value={form.expectedSender}
        onChangeText={(v) => setField('expectedSender', v)}
        error={errors.expectedSender}
        hint="Exact sender name as it appears in SMS (case-insensitive)"
      />

      <Input
        label="Source Shortcode"
        placeholder="e.g. 247247"
        value={form.sourceShortcode}
        onChangeText={(v) => setField('sourceShortcode', v)}
        keyboardType="phone-pad"
      />

      <Input
        label="Source Phone Number"
        placeholder="e.g. +2547XXXXXXXX"
        value={form.sourcePhoneNumber}
        onChangeText={(v) => setField('sourcePhoneNumber', v)}
        keyboardType="phone-pad"
      />

      {/* Extraction Rules */}
      <SectionLabel>Extraction Rules</SectionLabel>

      <Input
        label="Reference Keyword"
        placeholder="e.g. Ref, reference:, Txn Ref"
        value={form.referenceKeyword}
        onChangeText={(v) => setField('referenceKeyword', v)}
        hint="Keyword preceding the transaction reference in the SMS body"
      />

      <Input
        label="Amount Keyword"
        placeholder="e.g. Ksh, KES, Amount:"
        value={form.amountKeyword}
        onChangeText={(v) => setField('amountKeyword', v)}
        hint="Keyword preceding the payment amount in the SMS body"
      />

      {/* Read Policy */}
      <SectionLabel>Read Policy</SectionLabel>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Auto-read SMS</Text>
          <Text style={styles.toggleSub}>
            {Platform.OS === 'android'
              ? 'Periodically read SMS inbox in the background'
              : 'Not available on iOS'}
          </Text>
        </View>
        <Switch
          value={form.autoRead}
          onValueChange={(v) => setField('autoRead', v)}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={form.autoRead ? colors.primary : colors.textMuted}
          disabled={Platform.OS === 'ios'}
        />
      </View>

      {form.autoRead && (
        <Input
          label="Poll Interval (minutes)"
          placeholder="15"
          value={form.intervalMinutes}
          onChangeText={(v) => setField('intervalMinutes', v)}
          keyboardType="number-pad"
          error={errors.intervalMinutes}
          hint="How often the app checks for new SMS messages"
        />
      )}

      <Input
        label="Sync Endpoint (optional)"
        placeholder="https://your-server.com/sms/ingest"
        value={form.syncEndpoint}
        onChangeText={(v) => setField('syncEndpoint', v)}
        hint="Server URL where SMS messages are posted for processing"
        autoCapitalize="none"
        keyboardType="url"
      />

      {/* Manual Trigger (edit mode only) */}
      {isEdit && (
        <>
          <SectionLabel>Manual Trigger</SectionLabel>
          <TouchableOpacity
            style={[styles.readNowBtn, (reading || !isSupported && !isIOS) && styles.readNowBtnDisabled]}
            onPress={triggerRead}
            disabled={reading}
            activeOpacity={0.8}
          >
            {reading ? (
              <Text style={styles.readNowBtnText}>Reading SMS…</Text>
            ) : (
              <>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.readNowBtnText}>Read SMS Now</Text>
              </>
            )}
          </TouchableOpacity>
          {!isSupported && !isIOS && (
            <Text style={styles.moduleNote}>
              Install react-native-get-sms-android to enable device SMS reading.
            </Text>
          )}
        </>
      )}

      <View style={{ height: Spacing.md }} />

      <Button
        title={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Policy'}
        onPress={handleSave}
        loading={saving}
        disabled={saving || editLoading || !deviceReady}
      />

      <View style={{ height: Spacing.xl }} />
    </FormLayout>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.overlay,
      borderRadius: Radius.sm,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    deviceLabel: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
    },
    deviceId: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.text,
      marginTop: 1,
    },
    permBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    permGranted: { backgroundColor: Colors.success + '18' },
    permDenied: { backgroundColor: Colors.warning + '18' },
    permBadgeText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold },
    permGrantedText: { color: Colors.success },
    permDeniedText: { color: Colors.warning },

    permBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: Colors.warning + '10',
      borderWidth: 1,
      borderColor: Colors.warning + '40',
      borderRadius: Radius.sm,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    permBannerText: {
      flex: 1,
      fontSize: Typography.fontSizeXs,
      color: Colors.warning,
    },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      marginBottom: Spacing.sm,
    },
    toggleLabel: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
      color: c.text,
    },
    toggleSub: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: 2,
    },

    readNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: c.primary,
      borderRadius: Radius.sm,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    readNowBtnDisabled: { opacity: 0.6 },
    readNowBtnText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: '#fff',
    },

    moduleNote: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
  });
}
