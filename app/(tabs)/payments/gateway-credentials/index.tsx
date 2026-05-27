import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OperationResponseModal } from '@/components/ui/OperationResponseModal';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { ROTATE_GATEWAY_WEBHOOK_CREDENTIALS } from '@/graphql/properties/mutations/gateway-credentials';
import { GATEWAY_CREDENTIAL_LIST_DATA } from '@/graphql/properties/queries/gateway-credentials';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CredentialItem = {
  id?: string;
  credentialId?: string;
  name?: string;
  gatewayCode?: string;
  environment?: string;
  merchantCode?: string;
  isActive?: boolean;
  paymentModeName?: string;
  paymentMode?: { name?: string };
  webhookEndpoint?: string;
  callbacksCount?: number;
  callbackSummary?: string;
};

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

function getCredentialId(item: CredentialItem): string {
  return String(item?.credentialId ?? item?.id ?? '');
}

function getEnvironmentTone(environment?: string): 'live' | 'test' | 'neutral' {
  const value = String(environment ?? '').toLowerCase();
  if (value === 'live' || value === 'production' || value === 'prod') return 'live';
  if (value === 'test' || value === 'sandbox' || value === 'staging') return 'test';
  return 'neutral';
}

function CredentialCard({
  item,
  busy,
  onEdit,
  onDelete,
  onRotate,
  onHistory,
}: {
  item: CredentialItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onHistory: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const environmentTone = getEnvironmentTone(item.environment);
  const modeLabel = item.paymentModeName ?? item.paymentMode?.name ?? '-';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.name ?? 'Unnamed credential'}</Text>
          <Text style={styles.meta}>Gateway: {item.gatewayCode ?? '-'}</Text>
          <Text style={styles.meta}>Merchant: {item.merchantCode ?? '-'}</Text>
          {item.webhookEndpoint ? <Text style={styles.meta}>Webhook: {item.webhookEndpoint}</Text> : null}
          {item.callbackSummary ? <Text style={styles.meta}>{item.callbackSummary}</Text> : null}
        </View>

        <View style={styles.statusStack}>
          <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View
            style={[
              styles.infoChip,
              environmentTone === 'live'
                ? styles.envChipLive
                : environmentTone === 'test'
                  ? styles.envChipTest
                  : styles.envChipNeutral,
            ]}
          >
            <Text
              style={[
                styles.infoChipText,
                environmentTone === 'live'
                  ? styles.envChipTextLive
                  : environmentTone === 'test'
                    ? styles.envChipTextTest
                    : styles.envChipTextNeutral,
              ]}
              numberOfLines={1}
            >
              {item.environment ?? '-'}
            </Text>
          </View>

          <View style={[styles.infoChip, styles.modeChip]}>
            <Text style={[styles.infoChipText, styles.modeChipText]} numberOfLines={1}>{modeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit} disabled={busy}>
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDelete} disabled={busy}>
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onRotate} disabled={busy}>
          <Ionicons name="refresh-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Rotate Webhook</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onHistory} disabled={busy}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Callback History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GatewayCredentialListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeCompany, isAuthenticated } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseTitle, setResponseTitle] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responsePayload, setResponsePayload] = useState<unknown>(null);
  const goToSettings = () => router.push('/(tabs)/profile/settings' as any);

  const { data, loading, error, refetch } = useQuery(GATEWAY_CREDENTIAL_LIST_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [rotateWebhookCredentials] = useMutation(ROTATE_GATEWAY_WEBHOOK_CREDENTIALS);

  const payload = normalizeGenericScalarPayload((data as any)?.gatewayCredentialListData ?? {});
  const items: CredentialItem[] = Array.isArray(payload?.items) ? payload.items : [];

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function rotateCredential(credentialId: string) {
    if (!credentialId) {
      Alert.alert('Missing id', 'This credential is missing an id and cannot be rotated.');
      return;
    }

    setBusyId(credentialId);
    try {
      const res = await rotateWebhookCredentials({ variables: { input: { credentialId } } });
      const result = res?.data?.rotateGatewayWebhookCredentials;
      if (result?.success) {
        setResponseTitle('Webhook credentials rotated');
        setResponseMessage(result?.message ?? 'Webhook credentials rotated successfully.');
        setResponsePayload({
          webhookClientKey: result?.webhookClientKey,
          webhookClientSecret: result?.webhookClientSecret,
          webhookBasicAuthHeader: result?.webhookBasicAuthHeader,
        });
        setResponseOpen(true);
        await refetch();
      } else {
        Alert.alert('Rotation failed', result?.message ?? 'Could not rotate webhook credentials.');
      }
    } catch (e: any) {
      Alert.alert('Rotation failed', e?.message ?? 'Could not rotate webhook credentials.');
    } finally {
      setBusyId('');
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Gateway Credentials" showBack onBack={goToSettings} />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Gateway Credentials" showBack onBack={goToSettings} />
        <ErrorState title="Company required" message="Select a company to manage gateway credentials." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Gateway Credentials" showBack onBack={goToSettings} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Gateway Credentials" showBack onBack={goToSettings} />
        <ErrorState title="Unable to load credentials" message={error.message} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Gateway Credentials"
        showBack
        onBack={goToSettings}
        rightElement={
          <TouchableOpacity onPress={() => router.push('/(tabs)/payments/gateway-credentials/add' as any)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.page}>
        <FlatList
          key={isTablet ? 'tablet-2col' : 'phone-1col'}
          data={items}
          keyExtractor={(item, idx) => getCredentialId(item) || `cred-${idx}`}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="server-outline"
              title="No gateway credentials"
              description="Add your first payment gateway credential to receive provider callbacks."
            />
          }
          renderItem={({ item }) => {
            const credentialId = getCredentialId(item);
            const busy = busyId === credentialId;
            return (
              <View style={[styles.itemWrap, isTablet && styles.itemWrapTablet]}>
                <CredentialCard
                  item={item}
                  busy={busy}
                  onEdit={() => router.push({ pathname: '/(tabs)/payments/gateway-credentials/add', params: { id: credentialId } } as any)}
                  onDelete={() => router.push({ pathname: '/(tabs)/payments/gateway-credentials/delete', params: { id: credentialId } } as any)}
                  onRotate={() => rotateCredential(credentialId)}
                  onHistory={() => router.push({ pathname: '/(tabs)/payments/gateway-credentials/history', params: { id: credentialId } } as any)}
                />
              </View>
            );
          }}
        />
      </ScrollView>

      <OperationResponseModal
        visible={responseOpen}
        title={responseTitle || 'Operation Result'}
        message={responseMessage}
        response={responsePayload}
        onClose={() => setResponseOpen(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    list: { gap: Spacing.sm },
    columnWrap: { justifyContent: 'space-between' },
    itemWrap: { width: '100%' },
    itemWrapTablet: { width: '48.5%' },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    headerRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
    statusStack: {
      alignItems: 'flex-end',
      gap: 6,
      maxWidth: 132,
    },
    title: { color: c.text, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, marginBottom: 4 },
    meta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: 2 },
    statusBadge: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
    statusActive: { backgroundColor: Colors.success + '18' },
    statusInactive: { backgroundColor: c.borderLight },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
    statusTextActive: { color: Colors.success },
    statusTextInactive: { color: c.textMuted },
    infoChip: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      maxWidth: '100%',
    },
    infoChipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    envChipLive: { backgroundColor: Colors.success + '18' },
    envChipTest: { backgroundColor: Colors.warning + '20' },
    envChipNeutral: { backgroundColor: c.borderLight },
    envChipTextLive: { color: Colors.success },
    envChipTextTest: { color: Colors.warning },
    envChipTextNeutral: { color: c.textMuted },
    modeChip: { backgroundColor: c.primary + '1A' },
    modeChipText: { color: c.primary },
    actionRow: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.sm,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    actionText: { color: c.text, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },
  });
}
