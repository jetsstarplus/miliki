import { Button } from '@/components/ui/Button';
import { FormLayout } from '@/components/ui/FormLayout';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { DELETE_GATEWAY_CREDENTIAL_RELAY } from '@/graphql/properties/mutations/gateway-credentials';
import { GATEWAY_CREDENTIAL_DELETE_DATA } from '@/graphql/properties/queries/gateway-credentials';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

function normalizeGenericScalarPayload(value: any): any {
  if (!value) return {};

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }

  for (let i = 0; i < 3; i += 1) {
    if (!(parsed && typeof parsed === 'object' && 'data' in parsed)) break;
    const next = (parsed as any).data;
    if (typeof next === 'string') {
      try {
        parsed = JSON.parse(next);
      } catch {
        break;
      }
    } else if (next && typeof next === 'object') {
      parsed = next;
    } else {
      break;
    }
  }

  return parsed;
}

export default function GatewayCredentialDeleteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { data, loading } = useQuery(GATEWAY_CREDENTIAL_DELETE_DATA, {
    variables: { credentialId: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });

  const [deleteCredential, { loading: deleting }] = useMutation(DELETE_GATEWAY_CREDENTIAL_RELAY);

  const payload = normalizeGenericScalarPayload((data as any)?.gatewayCredentialDeleteData ?? {});
  const credential = payload?.credential ?? payload?.item ?? {};

  async function handleDelete() {
    if (!id) return;

    setServerError('');
    try {
      const res = await deleteCredential({ variables: { input: { credentialId: id } } });
      const result = res?.data?.deleteGatewayCredentialRelay;
      if (result?.success) {
        Alert.alert('Deleted', result?.message ?? 'Gateway credential deleted successfully.');
        router.replace('/(tabs)/payments/gateway-credentials' as any);
      } else {
        setServerError(result?.message ?? 'Delete failed.');
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Delete failed.');
    }
  }

  return (
    <FormLayout title="Delete Gateway Credential" onBack={() => router.push('/(tabs)/payments/gateway-credentials' as any)}>
      {serverError ? <ServerErrorBanner message={serverError} /> : null}

      <View style={styles.warningCard}>
        <Ionicons name="warning-outline" size={22} color="#E53935" />
        <View style={{ flex: 1 }}>
          <Text style={styles.warningTitle}>Confirm delete</Text>
          <Text style={styles.warningText}>
            This action permanently removes the selected gateway credential and cannot be undone.
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Row label="Name" value={credential?.name ?? '-'} />
        <Row label="Gateway" value={credential?.gatewayCode ?? '-'} />
        <Row label="Environment" value={credential?.environment ?? '-'} />
        <Row label="Merchant" value={credential?.merchantCode ?? '-'} />
      </View>

      <Button title={deleting ? 'Deleting...' : 'Delete Credential'} onPress={handleDelete} loading={deleting || loading} />
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
    row: { marginBottom: Spacing.xs },
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
