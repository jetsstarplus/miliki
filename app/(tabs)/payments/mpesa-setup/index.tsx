import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OperationResponseModal } from '@/components/ui/OperationResponseModal';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    CHECK_MPESA_SETUP_BALANCE,
    FETCH_MPESA_SETUP_PULL,
    REGISTER_MPESA_SETUP_C2B,
    REGISTER_MPESA_SETUP_PULL,
    TOGGLE_MPESA_SETUP_ACTIVE,
} from '@/graphql/properties/mutations/mpesa';
import { MPESA_SETUP_LIST_DATA } from '@/graphql/properties/queries/mpesa';
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

type MpesaSetupItem = {
  id?: string;
  setupId?: string;
  encryptedId?: string;
  name?: string;
  shortCode?: string;
  deployment?: string;
  active?: boolean;
  isActive?: boolean;
  paymentModeName?: string;
  paymentMode?: { name?: string };
  buildingCount?: number;
  callbackUrls?: Record<string, any>;
};

function getSetupId(item: MpesaSetupItem): string {
  return String(item?.setupId ?? item?.id ?? item?.encryptedId ?? '');
}

function getActive(item: MpesaSetupItem): boolean {
  if (typeof item?.active === 'boolean') return item.active;
  return Boolean(item?.isActive);
}

function SetupCard({
  item,
  busy,
  onEdit,
  onDelete,
  onToggle,
  onRegisterC2B,
  onRegisterPull,
  onCheckBalance,
  onFetchPull,
}: {
  item: MpesaSetupItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRegisterC2B: () => void;
  onRegisterPull: () => void;
  onCheckBalance: () => void;
  onFetchPull: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const active = getActive(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.name ?? 'Unnamed setup'}</Text>
          <Text style={styles.meta}>
            Short code: {item.shortCode ?? '-'} | Deployment: {item.deployment ?? '-'}
          </Text>
          <Text style={styles.meta}>
            Payment mode: {item?.paymentMode?.name ?? item?.paymentModeName ?? '-'} | Buildings: {item.buildingCount ?? '-'}
          </Text>
        </View>
        <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, active ? styles.statusTextActive : styles.statusTextInactive]}>
            {active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit} disabled={busy}>
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onToggle} disabled={busy}>
          <Ionicons name={active ? 'pause-outline' : 'play-outline'} size={14} color={colors.primary} />
          <Text style={styles.actionText}>{active ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDelete} disabled={busy}>
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.opsRow}>
        <Button title="Register C2B URL" onPress={onRegisterC2B} disabled={busy || !active} />
        <Button title="Register Pull URL" onPress={onRegisterPull} disabled={busy || !active} />
        <Button title="Check Balance" onPress={onCheckBalance} disabled={busy || !active} />
        <Button title="Fetch Pull" onPress={onFetchPull} disabled={busy} />
      </View>
    </View>
  );
}

export default function MpesaSetupListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeCompany, isAuthenticated } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [busyId, setBusyId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseTitle, setResponseTitle] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responsePayload, setResponsePayload] = useState<unknown>(null);

  const { data, loading, error, refetch } = useQuery(MPESA_SETUP_LIST_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !activeCompany?.id || !isAuthenticated,
  });

  const [toggleActive] = useMutation(TOGGLE_MPESA_SETUP_ACTIVE);
  const [registerC2B] = useMutation(REGISTER_MPESA_SETUP_C2B);
  const [registerPull] = useMutation(REGISTER_MPESA_SETUP_PULL);
  const [checkBalance] = useMutation(CHECK_MPESA_SETUP_BALANCE);
  const [fetchPull] = useMutation(FETCH_MPESA_SETUP_PULL);
  const goToSettings = () => router.push('/(tabs)/profile/settings' as any);

  const payload = (data as any)?.mpesaSetupListData ?? {};
  const items = Array.isArray(payload?.items) ? payload.items : [];

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function runSetupAction(
    setupId: string,
    action: () => Promise<any>,
    successTitle: string,
  ) {
    if (!setupId) {
      Alert.alert('Missing setup id', 'This setup is missing an id and cannot be processed.');
      return;
    }

    setBusyId(setupId);
    try {
      const res = await action();
      const payloadObj =
        res?.data?.toggleMpesaSetupActive ||
        res?.data?.registerMpesaSetupC2b ||
        res?.data?.registerMpesaSetupPull ||
        res?.data?.checkMpesaSetupBalance ||
        res?.data?.fetchMpesaSetupPull;

      if (payloadObj?.success) {
        setResponseTitle(successTitle);
        setResponseMessage(payloadObj?.message ?? 'Operation completed.');
        setResponsePayload(payloadObj?.response ?? null);
        setResponseOpen(true);
        await refetch();
      } else {
        Alert.alert('Operation failed', payloadObj?.message ?? 'Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Operation failed', e?.message ?? 'Please try again.');
    } finally {
      setBusyId('');
    }
  }

  async function handleGlobalFetchPull() {
    try {
      const res = await fetchPull({ variables: { input: {} } });
      const result = res?.data?.fetchMpesaSetupPull;
      if (result?.success) {
        setResponseTitle('Fetch transactions');
        setResponseMessage(result?.message ?? 'Pull transactions fetched.');
        setResponsePayload(result?.response ?? null);
        setResponseOpen(true);
        await refetch();
      } else {
        Alert.alert('Fetch failed', result?.message ?? 'Could not fetch pull transactions.');
      }
    } catch (e: any) {
      Alert.alert('Fetch failed', e?.message ?? 'Could not fetch pull transactions.');
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="M-Pesa Setup" showBack onBack={goToSettings} />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="M-Pesa Setup" showBack onBack={goToSettings} />
        <ErrorState title="Company required" message="Please choose a company before managing M-Pesa setups." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="M-Pesa Setup" showBack onBack={goToSettings} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="M-Pesa Setup" showBack onBack={goToSettings} />
        <ErrorState title="Could not load setups" message={error.message} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="M-Pesa Setup"
        showBack
        onBack={goToSettings}
        rightElement={
          <TouchableOpacity onPress={() => router.push('/(tabs)/payments/mpesa-setup/add' as any)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.page}>
        <Button title="Fetch Pull Transactions (All Setups)" onPress={handleGlobalFetchPull} />

        <FlatList
          key={isTablet ? 'tablet-2col' : 'phone-1col'}
          data={items}
          keyExtractor={(item: MpesaSetupItem, idx) => getSetupId(item) || `setup-${idx}`}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="phone-portrait-outline"
              title="No M-Pesa setups"
              description="Create your first setup to configure C2B, pull, and balance operations."
            />
          }
          renderItem={({ item }) => {
            const setupId = getSetupId(item);
            const busy = busyId === setupId;
            const active = getActive(item);

            return (
              <View style={[styles.itemWrap, isTablet && styles.itemWrapTablet]}>
                <SetupCard
                  item={item}
                  busy={busy}
                  onEdit={() => router.push({ pathname: '/(tabs)/payments/mpesa-setup/add', params: { id: setupId } } as any)}
                  onDelete={() => router.push({ pathname: '/(tabs)/payments/mpesa-setup/delete', params: { id: setupId } } as any)}
                  onToggle={() =>
                    runSetupAction(
                      setupId,
                      () => toggleActive({ variables: { input: { setupId } } }),
                      active ? 'Setup deactivated' : 'Setup activated',
                    )
                  }
                  onRegisterC2B={() =>
                    runSetupAction(
                      setupId,
                      () => registerC2B({ variables: { input: { setupId } } }),
                      'C2B URL registration',
                    )
                  }
                  onRegisterPull={() =>
                    runSetupAction(
                      setupId,
                      () => registerPull({ variables: { input: { setupId } } }),
                      'Pull URL registration',
                    )
                  }
                  onCheckBalance={() =>
                    runSetupAction(
                      setupId,
                      () => checkBalance({ variables: { input: { setupId } } }),
                      'Balance check',
                    )
                  }
                  onFetchPull={() =>
                    runSetupAction(
                      setupId,
                      () => fetchPull({ variables: { input: { setupId } } }),
                      'Pull transactions fetch',
                    )
                  }
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
    list: { paddingTop: Spacing.md, gap: Spacing.sm },
    columnWrap: { justifyContent: 'space-between' },
    itemWrap: { width: '100%' },
    itemWrapTablet: { width: '48.5%' },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
    titleWrap: { flex: 1 },
    title: {
      color: c.text,
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    meta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: 2 },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusActive: { backgroundColor: Colors.success + '18' },
    statusInactive: { backgroundColor: c.borderLight },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
    statusTextActive: { color: Colors.success },
    statusTextInactive: { color: c.textMuted },
    actionsRow: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
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
    opsRow: { marginTop: Spacing.sm, gap: Spacing.xs },
  });
}
