import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { DELETE_MPESA_SETUP } from '@/graphql/properties/mutations/mpesa';
import { MPESA_SETUP_DELETE_DATA, MPESA_SETUP_LIST_DATA } from '@/graphql/properties/queries/mpesa';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function MpesaSetupDeleteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { data, loading } = useQuery(MPESA_SETUP_DELETE_DATA, {
    variables: { setupId: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });

  const [deleteSetup, { loading: deleting }] = useMutation(DELETE_MPESA_SETUP, {
    refetchQueries: [{ query: MPESA_SETUP_LIST_DATA }],
  });

  const payload = (data as any)?.mpesaSetupDeleteData ?? {};
  const summary = payload?.summary ?? payload?.item ?? {};

  async function handleDelete() {
    if (!id) return;

    setServerError('');
    try {
      const res = await deleteSetup({ variables: { input: { setupId: id } } });
      const result = res?.data?.deleteMpesaSetup;
      if (result?.success) {
        Alert.alert('Deleted', result?.message ?? 'M-Pesa setup deleted successfully.');
        router.replace('/(tabs)/payments/mpesa-setup' as any);
      } else {
        setServerError(result?.message ?? 'Delete failed.');
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Delete failed.');
    }
  }

  return (
    <FormLayout title="Delete M-Pesa Setup" onBack={() => router.push('/(tabs)/payments/mpesa-setup' as any)}>
      {serverError ? <ServerErrorBanner message={serverError} /> : null}

      <View style={styles.warningCard}>
        <Ionicons name="warning-outline" size={22} color="#E53935" />
        <View style={{ flex: 1 }}>
          <Text style={styles.warningTitle}>Confirm delete</Text>
          <Text style={styles.warningText}>
            This action permanently removes the selected setup and cannot be undone.
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Name" value={summary?.name ?? '-'} />
        <Row label="Short code" value={summary?.shortCode ?? '-'} />
        <Row label="Deployment" value={summary?.deployment ?? '-'} />
        <Row label="Status" value={typeof summary?.active === 'boolean' ? (summary.active ? 'Active' : 'Inactive') : '-'} />
      </View>

      <Button title={deleting ? 'Deleting...' : 'Delete Setup'} onPress={handleDelete} loading={deleting || loading} />
      <View style={{ height: Spacing.sm }} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </FormLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    warningCard: {
      backgroundColor: '#E5393510',
      borderColor: '#E5393530',
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    warningTitle: {
      color: '#E53935',
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 2,
    },
    warningText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
    },
    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
    },
    row: {
      marginBottom: Spacing.xs,
    },
    rowLabel: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      marginBottom: 2,
    },
    rowValue: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
    },
  });
}
